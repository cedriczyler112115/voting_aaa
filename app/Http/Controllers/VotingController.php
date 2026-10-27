<?php

namespace App\Http\Controllers;

use App\Models\VotingAuditLog;
use App\Models\VotingAward;
use App\Models\VotingEvent;
use App\Models\VotingNominee;
use App\Models\VotingVote;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class VotingController extends Controller
{
    /**
     * Display list of published / accessible voting events.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        $nowStr = now()->toDateTimeString();

        // Get count of distinct staff (voters) who have voted per event
        $staffVotedCounts = VotingVote::query()
            ->select('voting_event_id', DB::raw('COUNT(DISTINCT voter_id) as count'))
            ->groupBy('voting_event_id')
            ->pluck('count', 'voting_event_id');

        // Get count of authorized voters per event (is_eligible = true)
        $authorizedVotersCounts = DB::table('voting_user_eligibilities')
            ->select('voting_event_id', DB::raw('COUNT(*) as count'))
            ->where('is_eligible', true)
            ->groupBy('voting_event_id')
            ->pluck('count', 'voting_event_id');

        // Get count of distinct awards the current logged-in user has voted in per event
        $userVotedAwardsCounts = $user
            ? VotingVote::query()
                ->select('voting_event_id', DB::raw('COUNT(DISTINCT voting_award_id) as count'))
                ->where('voter_id', $user->id)
                ->groupBy('voting_event_id')
                ->pluck('count', 'voting_event_id')
            : collect();

        // User eligibility per event
        $userEligibilities = $user
            ? DB::table('voting_user_eligibilities')
                ->where('user_id', $user->id)
                ->where('is_eligible', true)
                ->pluck('is_eligible', 'voting_event_id')
            : collect();

        $events = VotingEvent::query()
            ->with(['awards' => function ($query) {
                $query->where('status', 'active');
            }])
            ->whereIn('status', ['published', 'scheduled', 'closed', 'archived'])
            ->orderByRaw('CASE 
                WHEN status = ? AND (starts_at IS NULL OR starts_at <= ?) AND (ends_at IS NULL OR ends_at >= ?) THEN 1
                WHEN status = ? OR (status = ? AND starts_at > ?) THEN 2
                WHEN status = ? OR (ends_at IS NOT NULL AND ends_at < ?) THEN 3
                ELSE 4 END', [
                'published', $nowStr, $nowStr,
                'scheduled', 'published', $nowStr,
                'closed', $nowStr,
            ])
            ->orderByDesc('created_at')
            ->get()
            ->map(function (VotingEvent $event) use ($user, $staffVotedCounts, $authorizedVotersCounts, $userVotedAwardsCounts, $userEligibilities) {
                $totalAwards = $event->awards->count();
                $userVotedAwardsCount = (int) ($userVotedAwardsCounts[$event->id] ?? 0);
                $staffVotedCount = (int) ($staffVotedCounts[$event->id] ?? 0);
                $authorizedVotersCount = (int) ($authorizedVotersCounts[$event->id] ?? 0);
                $turnoutPercentage = $authorizedVotersCount > 0
                    ? round(($staffVotedCount / $authorizedVotersCount) * 100)
                    : 0;

                return [
                    'id' => $event->id,
                    'title' => $event->title,
                    'slug' => $event->slug,
                    'description' => $event->description,
                    'banner_path' => $event->banner_path,
                    'starts_at' => $event->starts_at?->toIso8601String(),
                    'ends_at' => $event->ends_at?->toIso8601String(),
                    'starts_at_formatted' => $event->starts_at?->format('M d, Y \a\t h:i A'),
                    'ends_at_formatted' => $event->ends_at?->format('M d, Y \a\t h:i A'),
                    'status' => $event->computed_status,
                    'is_open' => $event->isOpen(),
                    'is_upcoming' => $event->isUpcoming(),
                    'is_closed' => $event->isClosed(),
                    'can_view_results' => $event->canViewResults($user),
                    'allow_vote_changes' => $event->allow_vote_changes,
                    'total_awards' => $totalAwards,
                    'voted_awards_count' => $userVotedAwardsCount,
                    'staff_voted_count' => $staffVotedCount,
                    'authorized_voters_count' => $authorizedVotersCount,
                    'turnout_percentage' => $turnoutPercentage,
                    'progress_percentage' => $turnoutPercentage,
                    'is_eligible' => $user ? (bool) ($userEligibilities[$event->id] ?? false) : false,
                ];
            });

        return Inertia::render('voting/index', [
            'events' => $events,
        ]);
    }

    /**
     * Show a voting event with its awards and nominees.
     */
    public function show(Request $request, string $slug): Response
    {
        $user = $request->user();

        $event = VotingEvent::query()
            ->with([
                'awards' => function ($query) {
                    $query->where('status', 'active')
                        ->orderBy('display_order')
                        ->orderBy('id')
                        ->with(['nominees' => function ($nQuery) {
                            $nQuery->where('status', 'active')
                                ->orderBy('display_order')
                                ->orderBy('id');
                        }]);
                },
            ])
            ->where('slug', $slug)
            ->firstOrFail();

        // Retrieve voter's existing votes for this event
        $userVotes = [];
        if ($user) {
            $votes = VotingVote::query()
                ->where('voter_id', $user->id)
                ->where('voting_event_id', $event->id)
                ->get();

            foreach ($votes as $vote) {
                $userVotes[$vote->voting_award_id][$vote->voting_nominee_id] = $vote->rank;
            }
        }

        $awards = $event->awards->map(function (VotingAward $award) use ($userVotes) {
            $awardUserVotes = $userVotes[$award->id] ?? [];
            $hasVoted = ! empty($awardUserVotes);
            $activeNominees = $award->nominees->where('status', 'active');
            $nomineesCount = $activeNominees->count();

            return [
                'id' => $award->id,
                'name' => $award->name,
                'description' => $award->description,
                'image_path' => $award->image_path,
                'is_open' => $award->isOpen(),
                'allows_vote_changes' => $award->allowsVoteChanges(),
                'has_voted' => $hasVoted,
                'max_rank' => $nomineesCount,
                'user_rankings' => $awardUserVotes,
                'nominees' => $award->nominees->map(fn (VotingNominee $nominee) => [
                    'id' => $nominee->id,
                    'name' => $nominee->name,
                    'description' => $nominee->description,
                    'photo_path' => $nominee->photo_path,
                    'department' => $nominee->department,
                    'organization' => $nominee->organization,
                    'status' => $nominee->status,
                    'user_rank' => $awardUserVotes[$nominee->id] ?? null,
                ]),
            ];
        });

        $totalAwards = $awards->count();
        $completedAwards = count($userVotes);

        // Retrieve all authorized/eligible voters for this event
        $authorizedEligibilities = $event->eligibilities()
            ->where('is_eligible', true)
            ->with('user')
            ->get();

        // Retrieve voter IDs who have voted in this event
        $votedVoterIds = VotingVote::query()
            ->where('voting_event_id', $event->id)
            ->distinct('voter_id')
            ->pluck('voter_id')
            ->toArray();

        // Filter to authorized voters who have NOT voted yet
        $unvotedVoters = $authorizedEligibilities
            ->filter(fn ($el) => ! in_array($el->user_id, $votedVoterIds))
            ->map(fn ($el) => [
                'id' => $el->user_id,
                'name' => $el->user ? $el->user->display_name : 'User #'.$el->user_id,
                'email' => $el->user?->email,
                'department' => $el->user?->department ?? $el->user?->section,
            ])
            ->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE)
            ->values();

        $totalAuthorizedCount = $authorizedEligibilities->count();
        $staffVotedCount = count($votedVoterIds);

        return Inertia::render('voting/show', [
            'event' => [
                'id' => $event->id,
                'title' => $event->title,
                'slug' => $event->slug,
                'description' => $event->description,
                'banner_path' => $event->banner_path,
                'starts_at' => $event->starts_at?->toIso8601String(),
                'ends_at' => $event->ends_at?->toIso8601String(),
                'status' => $event->computed_status,
                'is_open' => $event->isOpen(),
                'is_closed' => $event->isClosed(),
                'can_view_results' => $event->canViewResults($user),
                'allow_vote_changes' => $event->allow_vote_changes,
                'is_eligible' => $event->isUserEligible($user),
                'total_awards' => $totalAwards,
                'completed_awards' => $completedAwards,
                'progress_percentage' => $totalAwards > 0 ? round(($completedAwards / $totalAwards) * 100) : 0,
                'total_authorized_voters' => $totalAuthorizedCount,
                'staff_voted_count' => $staffVotedCount,
            ],
            'unvoted_voters' => $unvotedVoters,
            'awards' => $awards,
        ]);
    }

    /**
     * Submit or change ranking votes for an award.
     */
    public function castVote(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'voting_award_id' => ['required', 'integer', 'exists:voting_awards,id'],
            'rankings' => ['nullable'],
            'voting_nominee_id' => ['nullable', 'integer'],
        ]);

        $user = $request->user();

        // 1. Fetch award and verify parent event and active nominees
        $award = VotingAward::query()
            ->with(['event', 'nominees' => function ($q) {
                $q->where('status', 'active');
            }])
            ->whereKey($validated['voting_award_id'])
            ->firstOrFail();

        $event = $award->event;
        $activeNominees = $award->nominees;
        $nomineesCount = $activeNominees->count();

        if ($nomineesCount === 0) {
            return back()->with('error', 'No active nominees registered for this award.');
        }

        // 2. Validate user eligibility
        if (! $event->isUserEligible($user)) {
            return back()->with('error', 'You are not on the list of authorized voters for this event.');
        }

        // 3. Validate event voting window
        if (! $event->isOpen()) {
            if ($event->isUpcoming()) {
                return back()->with('error', 'Voting has not opened yet for this event.');
            }

            return back()->with('error', 'Voting is closed for this event.');
        }

        // 4. Validate award voting window & status
        if (! $award->isOpen()) {
            return back()->with('error', 'Voting for this award is currently unavailable or closed.');
        }

        // 5. Normalize rankings input map: [nominee_id => rank]
        $rankingsMap = [];
        if ($request->has('rankings')) {
            $raw = $request->input('rankings');
            if (is_array($raw)) {
                foreach ($raw as $key => $val) {
                    if (is_array($val) && isset($val['nominee_id'], $val['rank'])) {
                        $rankingsMap[(int) $val['nominee_id']] = (int) $val['rank'];
                    } elseif (is_array($val) && isset($val['voting_nominee_id'], $val['rank'])) {
                        $rankingsMap[(int) $val['voting_nominee_id']] = (int) $val['rank'];
                    } elseif (is_numeric($key) && is_numeric($val)) {
                        $rankingsMap[(int) $key] = (int) $val;
                    }
                }
            }
        } elseif ($request->filled('voting_nominee_id')) {
            $rankingsMap[(int) $request->input('voting_nominee_id')] = 1;
        }

        // 6. Validate complete ranking: all nominees must be ranked with distinct ranks from 1 to N
        if (count($rankingsMap) !== $nomineesCount) {
            return back()->with('error', "Please assign a unique rank to all {$nomineesCount} nominees (from {$nomineesCount} down to 1).");
        }

        $activeIds = $activeNominees->pluck('id')->all();
        if (array_diff(array_keys($rankingsMap), $activeIds) || array_diff($activeIds, array_keys($rankingsMap))) {
            return back()->with('error', 'Selected nominees are invalid or do not belong to this award.');
        }

        $assignedRanks = array_values($rankingsMap);
        sort($assignedRanks);
        if ($assignedRanks !== range(1, $nomineesCount)) {
            return back()->with('error', "Each nominee must have a unique rank from 1 to {$nomineesCount}. No duplicate ranks are allowed.");
        }

        // 7. Process ranking votes inside DB transaction
        return DB::transaction(function () use ($user, $event, $award, $rankingsMap, $request) {
            $existingVotesCount = VotingVote::query()
                ->where('voter_id', $user->id)
                ->where('voting_award_id', $award->id)
                ->lockForUpdate()
                ->count();

            if ($existingVotesCount > 0) {
                if (! $award->allowsVoteChanges()) {
                    return back()->with('error', 'You have already voted for this award, and changing votes is disabled.');
                }

                VotingVote::query()
                    ->where('voter_id', $user->id)
                    ->where('voting_award_id', $award->id)
                    ->delete();
            }

            $now = now();
            $ip = $request->ip();
            $userAgent = substr((string) $request->userAgent(), 0, 500);

            foreach ($rankingsMap as $nomineeId => $rank) {
                VotingVote::create([
                    'voter_id' => $user->id,
                    'voting_event_id' => $event->id,
                    'voting_award_id' => $award->id,
                    'voting_nominee_id' => $nomineeId,
                    'rank' => $rank,
                    'voted_at' => $now,
                    'ip_address' => $ip,
                    'user_agent' => $userAgent,
                ]);
            }

            VotingAuditLog::log(
                action: $existingVotesCount > 0 ? 'vote.changed' : 'vote.cast',
                description: "User [{$user->email}] cast ranking votes in award [{$award->name}]",
                auditable: $award,
                newValues: ['rankings' => $rankingsMap]
            );

            $msg = $existingVotesCount > 0
                ? "Your rankings for {$award->name} have been successfully updated!"
                : "Rankings successfully recorded for {$award->name}!";

            return back()->with('success', $msg);
        });
    }

    /**
     * View voter's own voting history with event and award category filters.
     */
    public function history(Request $request): Response
    {
        $user = $request->user();

        $selectedEventId = $request->filled('event_id') ? (int) $request->input('event_id') : null;
        $selectedAwardId = $request->filled('award_id') ? (int) $request->input('award_id') : null;

        // Fetch distinct events the user has cast votes in
        $events = VotingEvent::query()
            ->whereHas('votes', fn ($q) => $q->where('voter_id', $user->id))
            ->select('id', 'title', 'slug')
            ->orderByDesc('id')
            ->get();

        // Fetch distinct awards the user has cast votes in
        $awardsQuery = VotingAward::query()
            ->whereHas('votes', fn ($q) => $q->where('voter_id', $user->id))
            ->select('id', 'name', 'voting_event_id')
            ->orderBy('display_order')
            ->orderBy('id');

        if ($selectedEventId) {
            $awardsQuery->where('voting_event_id', $selectedEventId);
        }

        $awards = $awardsQuery->get();

        // If selected award doesn't belong to the selected event, reset it
        if ($selectedEventId && $selectedAwardId && ! $awards->contains('id', $selectedAwardId)) {
            $selectedAwardId = null;
        }

        $query = VotingVote::query()
            ->with(['event', 'award', 'nominee'])
            ->where('voter_id', $user->id);

        if ($selectedEventId) {
            $query->where('voting_event_id', $selectedEventId);
        }

        if ($selectedAwardId) {
            $query->where('voting_award_id', $selectedAwardId);
        }

        $votes = $query->orderByDesc('voted_at')
            ->orderByDesc('rank')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (VotingVote $vote) => [
                'id' => $vote->id,
                'event_title' => $vote->event ? $vote->event->title : 'N/A',
                'event_slug' => $vote->event ? $vote->event->slug : null,
                'award_name' => $vote->award ? $vote->award->name : 'N/A',
                'nominee_name' => $vote->nominee ? $vote->nominee->name : 'N/A',
                'nominee_department' => $vote->nominee ? $vote->nominee->department : null,
                'nominee_organization' => $vote->nominee ? $vote->nominee->organization : null,
                'rank' => $vote->rank,
                'rank_label' => "Rank {$vote->rank}",
                'voted_at' => $vote->voted_at->toDayDateTimeString(),
            ]);

        return Inertia::render('voting/history', [
            'votes' => $votes,
            'events' => $events,
            'awards' => $awards,
            'selected_event_id' => $selectedEventId,
            'selected_award_id' => $selectedAwardId,
        ]);
    }

    /**
     * View voting results if allowed.
     */
    public function results(Request $request, string $slug): Response
    {
        $user = $request->user();

        $event = VotingEvent::query()
            ->where('slug', $slug)
            ->firstOrFail();

        if (! $event->canViewResults($user)) {
            abort(403, 'Results are not available for viewing at this time.');
        }

        $awards = VotingAward::query()
            ->where('voting_event_id', $event->id)
            ->where('status', 'active')
            ->orderBy('display_order')
            ->with(['nominees' => function ($q) {
                $q->with('votes');
            }])
            ->get()
            ->map(function (VotingAward $award) use ($user) {
                if (! $award->canViewResults($user)) {
                    return [
                        'id' => $award->id,
                        'name' => $award->name,
                        'description' => $award->description,
                        'is_hidden' => true,
                        'total_votes' => 0,
                        'total_points' => 0,
                        'distinct_ballots' => 0,
                        'nominees' => [],
                    ];
                }

                $totalPoints = $award->nominees->sum(fn ($nominee) => $nominee->votes->sum('rank'));
                $distinctBallots = VotingVote::where('voting_award_id', $award->id)->distinct('voter_id')->count('voter_id');

                // Sort nominees with tie-breaker rules (total points/average, highest-rank counts, display order/id)
                $sortedNominees = $award->getSortedNominees()
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
                    'description' => $award->description,
                    'is_hidden' => false,
                    'total_votes' => $totalPoints,
                    'total_points' => $totalPoints,
                    'distinct_ballots' => $distinctBallots,
                    'nominees' => $sortedNominees,
                ];
            });

        return Inertia::render('voting/results', [
            'event' => [
                'id' => $event->id,
                'title' => $event->title,
                'slug' => $event->slug,
                'description' => $event->description,
                'banner_path' => $event->banner_path,
                'status' => $event->computed_status,
                'is_closed' => $event->isClosed(),
            ],
            'awards' => $awards,
        ]);
    }

    /**
     * View event tabulation results with grand announcement mystery mode.
     */
    public function tabulationResults(Request $request): Response
    {
        $user = $request->user();

        // Reveal condition: user is admin OR db table users.id = 2
        $canReveal = $user && ($user->isAdmin() || (int) $user->id === 2);

        $events = VotingEvent::query()
            ->select('id', 'title', 'slug', 'status', 'starts_at', 'ends_at', 'reveal_date')
            ->whereIn('status', ['published', 'scheduled', 'closed', 'archived'])
            ->orderByDesc('id')
            ->get();

        $selectedEventId = $request->input('event_id', $request->input('event'));
        if ($selectedEventId && ! is_numeric($selectedEventId)) {
            $matchedEvent = $events->firstWhere('slug', $selectedEventId);
            $selectedEventId = $matchedEvent ? $matchedEvent->id : null;
        }
        if (! $selectedEventId && $events->isNotEmpty()) {
            $selectedEventId = $events->first()->id;
        }

        $selectedEvent = null;
        $awardsData = [];
        $totalEventVotes = 0;
        $distinctVoters = 0;
        $isRevealDateReached = false;

        if ($selectedEventId) {
            $selectedEvent = VotingEvent::query()->whereKey($selectedEventId)->first();

            if ($selectedEvent) {
                $isRevealDateReached = $selectedEvent->isRevealDateReached();
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

                $awardsData = $awards->map(function (VotingAward $award) use ($canReveal, $isRevealDateReached) {
                    $totalPoints = $award->nominees->sum(fn ($nominee) => $nominee->votes->sum('rank'));
                    $distinctBallots = VotingVote::where('voting_award_id', $award->id)->distinct('voter_id')->count('voter_id');

                    $sortedNominees = $award->getSortedNominees()
                        ->map(function (VotingNominee $nominee, int $index) use ($totalPoints, $distinctBallots, $canReveal, $isRevealDateReached) {
                            $points = (int) $nominee->votes->sum('rank');
                            $ballots = $nominee->votes->count();
                            $percentage = $totalPoints > 0 ? round(($points / $totalPoints) * 100, 1) : 0;
                            $averageScore = $distinctBallots > 0 ? round($points / $distinctBallots, 2) : 0.0;
                            $averageFormatted = number_format($averageScore, 2, '.', '');
                            $rank = $nominee->computed_rank ?? ($index + 1);
                            $isWinner = $rank === 1;
                            $shouldRevealNominee = $canReveal || $isRevealDateReached;

                            return [
                                'id' => $nominee->id,
                                'name' => $shouldRevealNominee ? $nominee->name : ('Nominee #' . ($index + 1)),
                                'photo_path' => $shouldRevealNominee ? $nominee->photo_path : '/images/user_unknown.png',
                                'department' => $shouldRevealNominee ? $nominee->department : null,
                                'organization' => $shouldRevealNominee ? $nominee->organization : null,
                                'status' => $nominee->status,
                                'votes_count' => $points,
                                'total_points' => $points,
                                'average_score' => $averageFormatted,
                                'average_score_num' => $averageScore,
                                'ballots_count' => $ballots,
                                'percentage' => $percentage,
                                'rank' => $rank,
                                'is_tied' => (bool) ($nominee->is_tied ?? false),
                                'is_masked' => ! $shouldRevealNominee,
                                'is_winner' => $isWinner,
                            ];
                        });

                    return [
                        'id' => $award->id,
                        'name' => $award->name,
                        'description' => $award->description,
                        'total_votes' => $totalPoints,
                        'total_points' => $totalPoints,
                        'distinct_ballots' => $distinctBallots,
                        'nominees' => $sortedNominees,
                    ];
                });
            }
        }

        return Inertia::render('voting/tabulation', [
            'events' => $events->map(fn ($e) => [
                'id' => $e->id,
                'title' => $e->title,
                'slug' => $e->slug,
                'status' => $e->computed_status,
                'reveal_date' => $e->reveal_date?->format('Y-m-d'),
            ]),
            'selected_event_id' => $selectedEventId ? (int) $selectedEventId : null,
            'selected_event' => $selectedEvent ? [
                'id' => $selectedEvent->id,
                'title' => $selectedEvent->title,
                'slug' => $selectedEvent->slug,
                'status' => $selectedEvent->computed_status,
                'reveal_date' => $selectedEvent->reveal_date?->format('Y-m-d'),
                'results_visibility' => $selectedEvent->results_visibility,
                'total_votes' => $totalEventVotes,
                'distinct_voters' => $distinctVoters,
            ] : null,
            'awards' => $awardsData,
            'can_reveal' => $canReveal || $isRevealDateReached,
            'is_reveal_date_reached' => $isRevealDateReached,
        ]);
    }
}
