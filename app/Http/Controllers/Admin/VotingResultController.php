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
                    $totalPoints = $award->nominees->sum(fn ($nominee) => $nominee->votes->sum('rank'));
                    $distinctBallots = VotingVote::where('voting_award_id', $award->id)->distinct('voter_id')->count('voter_id');

                    $nominees = $award->getSortedNominees()
                        ->map(function (VotingNominee $nominee, int $index) use ($totalPoints, $distinctBallots) {
                            $points = (int) $nominee->votes->sum('rank');
                            $ballots = $nominee->votes->count();
                            $percentage = $totalPoints > 0 ? round(($points / $totalPoints) * 100, 1) : 0;
                            $averageScore = $distinctBallots > 0 ? round($points / $distinctBallots, 2) : 0.0;
                            $averageFormatted = number_format($averageScore, 2, '.', '');

                            return [
                                'id' => $nominee->id,
                                'name' => $nominee->name,
                                'photo_path' => $nominee->photo_path,
                                'department' => $nominee->department,
                                'organization' => $nominee->organization,
                                'status' => $nominee->status,
                                'votes_count' => $points,
                                'total_points' => $points,
                                'average_score' => $averageFormatted,
                                'average_score_num' => $averageScore,
                                'ballots_count' => $ballots,
                                'percentage' => $percentage,
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
            fputcsv($handle, []);

            fputcsv($handle, [
                'Award Name',
                'Rank',
                'Nominee Name',
                'Department',
                'Average Score',
                'Total Points',
                'Ballots Count',
                'Percentage (%)',
                'Total Award Points',
            ]);

            foreach ($awards as $award) {
                $totalPoints = $award->nominees->sum(fn ($nominee) => $nominee->votes->sum('rank'));
                $distinctBallots = VotingVote::where('voting_award_id', $award->id)->distinct('voter_id')->count('voter_id');
                $sortedNominees = $award->getSortedNominees();

                foreach ($sortedNominees as $index => $nominee) {
                    $points = (int) $nominee->votes->sum('rank');
                    $ballots = $nominee->votes->count();
                    $percentage = $totalPoints > 0 ? round(($points / $totalPoints) * 100, 1) : 0;
                    $averageScore = $distinctBallots > 0 ? round($points / $distinctBallots, 2) : 0.0;
                    $averageFormatted = number_format($averageScore, 2, '.', '');

                    fputcsv($handle, [
                        $award->name,
                        $nominee->computed_rank ?? ($index + 1),
                        $nominee->name,
                        $nominee->department ?? 'N/A',
                        $averageFormatted,
                        $points,
                        $ballots,
                        $percentage.'%',
                        $totalPoints,
                    ]);
                }

                if ($sortedNominees->isEmpty()) {
                    fputcsv($handle, [
                        $award->name,
                        '-',
                        'No nominees listed',
                        '-',
                        '0.00',
                        0,
                        0,
                        '0%',
                        0,
                    ]);
                }
            }

            fclose($handle);
        }, 200, $headers);
    }
}
