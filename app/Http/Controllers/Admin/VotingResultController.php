<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\VotingAuditLog;
use App\Models\VotingAward;
use App\Models\VotingEvent;
use App\Models\VotingNominee;
use App\Models\VotingVote;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class VotingResultController extends Controller
{
    public function index(Request $request): Response
    {
        $selectedEventId = $request->input('event_id');

        $events = VotingEvent::select('id', 'title', 'slug', 'status')
            ->orderByDesc('id')
            ->get();

        if (! $selectedEventId && $events->isNotEmpty()) {
            $selectedEventId = $events->first()->id;
        }

        $selectedEvent = null;
        $awardsData = [];
        $totalEventVotes = 0;
        $distinctVoters = 0;

        if ($selectedEventId) {
            $selectedEvent = VotingEvent::whereKey($selectedEventId)->first();

            if ($selectedEvent) {
                $totalEventVotes = VotingVote::where('voting_event_id', $selectedEvent->id)->count();
                $distinctVoters = VotingVote::where('voting_event_id', $selectedEvent->id)->distinct('voter_id')->count('voter_id');

                $awards = VotingAward::query()
                    ->where('voting_event_id', $selectedEvent->id)
                    ->orderBy('display_order')
                    ->orderBy('id')
                    ->with(['nominees' => function ($q) {
                        $q->with('votes');
                    }])
                    ->get();

                $awardsData = $awards->map(function (VotingAward $award) {
                    $totalPoints = $award->nominees->sum(fn ($nominee) => $nominee->votes->sum('score'));
                    $distinctBallots = VotingVote::where('voting_award_id', $award->id)->distinct('voter_id')->count('voter_id');

                    $nominees = $award->getSortedNominees()
                        ->map(function (VotingNominee $nominee, int $index) {
                            return [
                                'id' => $nominee->id,
                                'name' => $nominee->name,
                                'photo_path' => $nominee->photo_path,
                                'department' => $nominee->department,
                                'organization' => $nominee->organization,
                                'status' => $nominee->status,
                                'votes_count' => $nominee->ballots_count,
                                'total_points' => $nominee->total_points,
                                'final_score' => number_format((float) $nominee->final_score, 2),
                                'final_score_num' => (float) $nominee->final_score,
                                'dc_score' => number_format((float) $nominee->dc_score, 2),
                                'dc_weighted_score' => number_format((float) $nominee->dc_weighted_score, 2),
                                'dc_has_voted' => (bool) $nominee->dc_has_voted,
                                'sh_count' => (int) $nominee->sh_count,
                                'sh_average' => number_format((float) $nominee->sh_average, 2),
                                'sh_weighted_score' => number_format((float) $nominee->sh_weighted_score, 2),
                                'rank' => $nominee->computed_rank ?? ($index + 1),
                                'is_tied' => (bool) ($nominee->is_tied ?? false),
                            ];
                        });

                    return [
                        'id' => $award->id,
                        'name' => $award->name,
                        'status' => $award->status,
                        'total_votes' => $totalPoints,
                        'total_points' => $totalPoints,
                        'distinct_ballots' => $distinctBallots,
                        'nominees' => $nominees,
                    ];
                });
            }
        }

        return Inertia::render('admin/results/index', [
            'events' => $events,
            'selected_event_id' => $selectedEventId,
            'selected_event' => $selectedEvent ? [
                'id' => $selectedEvent->id,
                'title' => $selectedEvent->title,
                'slug' => $selectedEvent->slug,
                'status' => $selectedEvent->computed_status,
                'results_visibility' => $selectedEvent->results_visibility,
                'total_votes' => $totalEventVotes,
                'distinct_voters' => $distinctVoters,
            ] : null,
            'awards' => $awardsData,
        ]);
    }

    public function exportCsv(Request $request): StreamedResponse
    {
        $eventId = $request->input('event_id');
        $event = VotingEvent::whereKey($eventId)->firstOrFail();

        VotingAuditLog::log(
            action: 'results.exported',
            description: "Exported voting results for event [{$event->title}] to CSV",
            auditable: $event
        );

        $awards = VotingAward::query()
            ->where('voting_event_id', $event->id)
            ->orderBy('display_order')
            ->orderBy('id')
            ->with(['nominees' => function ($q) {
                $q->with('votes');
            }])
            ->get();

        $filename = 'voting_results_'.str_replace(' ', '_', strtolower($event->title)).'_'.now()->format('Ymd_His').'.csv';

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        return response()->stream(function () use ($event, $awards) {
            $handle = fopen('php://output', 'w');
            if (! is_resource($handle)) {
                return;
            }
            // Add UTF-8 BOM
            fwrite($handle, "\xEF\xBB\xBF");

            fputcsv($handle, ['Voting Event', $event->title]);
            fputcsv($handle, ['Status', $event->computed_status]);
            fputcsv($handle, ['Generated At', now()->toDateTimeString()]);
            fputcsv($handle, ['Scoring Formula', 'Final Score = (DC Score * 0.50) + (Section Heads Average * 0.50)']);
            fputcsv($handle, []);

            fputcsv($handle, [
                'Award Category',
                'Rank',
                'Nominee Name',
                'Department / Section',
                'DC Score (out of 100)',
                'DC Weighted Score (50%)',
                "Section Heads' Average Score",
                'SH Weighted Score (50%)',
                'Final Score (Weighted 100%)',
                'Section Heads Count',
            ]);

            foreach ($awards as $award) {
                $sortedNominees = $award->getSortedNominees();

                foreach ($sortedNominees as $index => $nominee) {
                    fputcsv($handle, [
                        $award->name,
                        $nominee->computed_rank ?? ($index + 1),
                        $nominee->name,
                        $nominee->department ?? 'N/A',
                        number_format((float) $nominee->dc_score, 2),
                        number_format((float) $nominee->dc_weighted_score, 2),
                        number_format((float) $nominee->sh_average, 2),
                        number_format((float) $nominee->sh_weighted_score, 2),
                        number_format((float) $nominee->final_score, 2),
                        $nominee->sh_count,
                    ]);
                }

                if ($sortedNominees->isEmpty()) {
                    fputcsv($handle, [
                        $award->name,
                        '-',
                        'No nominees listed',
                        '-',
                        '0.00',
                        '0.00',
                        '0.00',
                        '0.00',
                        '0.00',
                        0,
                    ]);
                }
            }

            fclose($handle);
        }, 200, $headers);
    }
}
