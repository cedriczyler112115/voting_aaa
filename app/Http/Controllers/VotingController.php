<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\VotingAuditLog;
use App\Models\VotingAward;
use App\Models\VotingCriterion;
use App\Models\VotingEvent;
use App\Models\VotingNominee;
use App\Models\VotingVote;
use App\Models\VotingVoteScore;
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
                'criteria' => function ($cQuery) {
                    $cQuery->orderBy('display_order')->orderBy('id');
                },
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

        // Retrieve voter's existing votes and criteria scores for this event
        $userVotes = [];
        if ($user) {
            $votes = VotingVote::query()
                ->with('scores')
                ->where('voter_id', $user->id)
                ->where('voting_event_id', $event->id)
                ->get();

            foreach ($votes as $vote) {
                $criteriaScores = [];
                foreach ($vote->scores as $vs) {
                    $criteriaScores[$vs->voting_criterion_id] = (float) $vs->score;
                }
                $userVotes[$vote->voting_award_id][$vote->voting_nominee_id] = [
                    'score' => (float) $vote->score,
                    'criteria_scores' => $criteriaScores,
                ];
            }
        }

        $awards = $event->awards->map(function (VotingAward $award) use ($userVotes) {
            $awardUserVotes = $userVotes[$award->id] ?? [];
            $activeNominees = $award->nominees->where('status', 'active');
            $nomineesCount = $activeNominees->count();
            $scoredCount = count($awardUserVotes);
            $hasVoted = $nomineesCount > 0 && $scoredCount >= $nomineesCount;

            return [
                'id' => $award->id,
                'name' => $award->name,
                'description' => $award->description,
                'image_path' => $award->image_path,
                'is_open' => $award->isOpen(),
                'allows_vote_changes' => $award->allowsVoteChanges(),
                'has_voted' => $hasVoted,
                'nominees_count' => $nomineesCount,
                'scored_nominees_count' => $scoredCount,
                'unscored_nominees_count' => max(0, $nomineesCount - $scoredCount),
                'user_scores' => $awardUserVotes,
                'nominees' => $award->nominees->map(fn (VotingNominee $nominee) => [
                    'id' => $nominee->id,
                    'name' => $nominee->name,
                    'description' => $nominee->description,
                    'photo_path' => $nominee->photo_path,
                    'department' => $nominee->department,
                    'organization' => $nominee->organization,
                    'status' => $nominee->status,
                    'user_score' => $awardUserVotes[$nominee->id]['score'] ?? null,
                    'user_criteria_scores' => $awardUserVotes[$nominee->id]['criteria_scores'] ?? (object) [],
                ]),
            ];
        });

        $totalAwards = $awards->count();
        $completedAwards = $event->awards->filter(function ($award) use ($userVotes) {
            $activeCount = $award->nominees->where('status', 'active')->count();
            $scoredCount = count($userVotes[$award->id] ?? []);
            return $activeCount > 0 && $scoredCount >= $activeCount;
        })->count();

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
                'criteria' => $event->criteria->map(fn (VotingCriterion $c) => [
                    'id' => $c->id,
                    'name' => $c->name,
                    'description' => $c->description,
                    'max_score' => (float) $c->max_score,
                    'display_order' => $c->display_order,
                ]),
                'total_criteria_score' => (float) $event->criteria->sum('max_score'),
            ],
            'unvoted_voters' => $unvotedVoters,
            'awards' => $awards,
        ]);
    }

    /**
     * Save an individual nominee's criteria score directly to the database.
     */
    public function saveNomineeScore(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'voting_award_id' => ['required', 'integer', 'exists:voting_awards,id'],
            'voting_nominee_id' => ['required', 'integer', 'exists:voting_nominees,id'],
            'scores' => ['required', 'array'],
        ]);

        $user = $request->user();

        $award = VotingAward::query()
            ->with([
                'event.criteria' => function ($q) {
                    $q->orderBy('display_order')->orderBy('id');
                },
                'nominees' => function ($q) {
                    $q->where('status', 'active');
                },
            ])
            ->whereKey($validated['voting_award_id'])
            ->firstOrFail();

        $event = $award->event;
        $criteria = $event->criteria;

        $nominee = $award->nominees->firstWhere('id', $validated['voting_nominee_id']);
        if (! $nominee) {
            return back()->with('error', 'Selected nominee is invalid or does not belong to this award.');
        }

        if ($criteria->isEmpty()) {
            return back()->with('error', 'No evaluation criteria configured for this event. Please contact the administrator.');
        }

        if (! $event->isUserEligible($user)) {
            return back()->with('error', 'You are not on the list of authorized voters for this event.');
        }

        if (! $event->isOpen()) {
            if ($event->isUpcoming()) {
                return back()->with('error', 'Voting has not opened yet for this event.');
            }

            return back()->with('error', 'Voting is closed for this event.');
        }

        if (! $award->isOpen()) {
            return back()->with('error', 'Voting for this award is currently unavailable or closed.');
        }

        $existingVote = VotingVote::query()
            ->where('voter_id', $user->id)
            ->where('voting_award_id', $award->id)
            ->where('voting_nominee_id', $nominee->id)
            ->first();

        if ($existingVote && ! $award->allowsVoteChanges()) {
            return back()->with('error', 'You have already submitted a score for this nominee, and changing scores is disabled.');
        }

        $rawScores = $validated['scores'];
        $breakdown = [];
        $nomineeTotal = 0.0;

        foreach ($criteria as $criterion) {
            if (! isset($rawScores[$criterion->id]) && ! isset($rawScores[(string) $criterion->id])) {
                return back()->with('error', "Please provide a score for criterion '{$criterion->name}'.");
            }

            $cScore = (float) ($rawScores[$criterion->id] ?? $rawScores[(string) $criterion->id]);
            if ($cScore < 0 || $cScore > (float) $criterion->max_score) {
                return back()->with('error', "Score for '{$criterion->name}' must be between 0 and {$criterion->max_score}.");
            }

            $nomineeTotal += $cScore;
            $breakdown[$criterion->id] = $cScore;
        }

        DB::transaction(function () use ($user, $event, $award, $nominee, $nomineeTotal, $breakdown, $request) {
            $now = now();
            $ip = $request->ip();
            $userAgent = substr((string) $request->userAgent(), 0, 500);

            $vote = VotingVote::updateOrCreate(
                [
                    'voter_id' => $user->id,
                    'voting_award_id' => $award->id,
                    'voting_nominee_id' => $nominee->id,
                ],
                [
                    'voting_event_id' => $event->id,
                    'score' => $nomineeTotal,
                    'rank' => null,
                    'voted_at' => $now,
                    'ip_address' => $ip,
                    'user_agent' => $userAgent,
                ]
            );

            foreach ($breakdown as $criterionId => $cScore) {
                VotingVoteScore::updateOrCreate(
                    [
                        'voting_vote_id' => $vote->id,
                        'voting_criterion_id' => $criterionId,
                    ],
                    [
                        'score' => $cScore,
                    ]
                );
            }

            VotingAuditLog::create([
                'user_id' => $user->id,
                'action' => 'vote.nominee_scored',
                'description' => "Scored nominee {$nominee->name} in award {$award->name} with total {$nomineeTotal}%",
                'metadata' => [
                    'voting_event_id' => $event->id,
                    'voting_award_id' => $award->id,
                    'voting_nominee_id' => $nominee->id,
                    'score' => $nomineeTotal,
                    'breakdown' => $breakdown,
                ],
                'ip_address' => $ip,
                'user_agent' => $userAgent,
            ]);
        });

        return back()->with('success', "Score for {$nominee->name} successfully saved to the database!");
    }

    /**
     * Submit or change criteria scoring votes for an award.
     */
    public function castVote(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'voting_award_id' => ['required', 'integer', 'exists:voting_awards,id'],
            'scores' => ['required', 'array'],
        ]);

        $user = $request->user();

        // 1. Fetch award and verify parent event, criteria, and active nominees
        $award = VotingAward::query()
            ->with([
                'event.criteria' => function ($q) {
                    $q->orderBy('display_order')->orderBy('id');
                },
                'nominees' => function ($q) {
                    $q->where('status', 'active');
                },
            ])
            ->whereKey($validated['voting_award_id'])
            ->firstOrFail();

        $event = $award->event;
        $criteria = $event->criteria;
        $activeNominees = $award->nominees;
        $nomineesCount = $activeNominees->count();

        if ($nomineesCount === 0) {
            return back()->with('error', 'No active nominees registered for this award.');
        }

        if ($criteria->isEmpty()) {
            return back()->with('error', 'No evaluation criteria configured for this event. Please contact the administrator.');
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

        // 5. Normalize scores input map: [nominee_id => [criterion_id => score]]
        $scoresMap = [];
        $rawScores = $request->input('scores');
        if (is_array($rawScores)) {
            foreach ($rawScores as $key => $val) {
                if (is_array($val) && isset($val['nominee_id'], $val['criteria_scores']) && is_array($val['criteria_scores'])) {
                    $scoresMap[(int) $val['nominee_id']] = $val['criteria_scores'];
                } elseif (is_numeric($key) && is_array($val)) {
                    $scoresMap[(int) $key] = $val;
                }
            }
        }

        // 6. Validate that all active nominees have been scored
        if (count($scoresMap) !== $nomineesCount) {
            return back()->with('error', "Please provide criteria scores for all {$nomineesCount} nominees.");
        }

        $activeIds = $activeNominees->pluck('id')->all();
        if (array_diff(array_keys($scoresMap), $activeIds) || array_diff($activeIds, array_keys($scoresMap))) {
            return back()->with('error', 'Selected nominees are invalid or do not belong to this award.');
        }

        // 7. Validate criteria scores per nominee
        $validatedNomineeScores = [];
        foreach ($scoresMap as $nomineeId => $nomineeCriteriaScores) {
            $nomineeTotal = 0.0;
            $breakdown = [];

            foreach ($criteria as $criterion) {
                if (! isset($nomineeCriteriaScores[$criterion->id]) && ! isset($nomineeCriteriaScores[(string) $criterion->id])) {
                    return back()->with('error', "Please provide a score for criterion '{$criterion->name}' for all nominees.");
                }

                $cScore = (float) ($nomineeCriteriaScores[$criterion->id] ?? $nomineeCriteriaScores[(string) $criterion->id]);
                if ($cScore < 0 || $cScore > (float) $criterion->max_score) {
                    return back()->with('error', "Score for '{$criterion->name}' must be between 0 and {$criterion->max_score}.");
                }

                $nomineeTotal += $cScore;
                $breakdown[$criterion->id] = $cScore;
            }

            $validatedNomineeScores[$nomineeId] = [
                'total' => $nomineeTotal,
                'breakdown' => $breakdown,
            ];
        }

        // 8. Process scoring votes inside DB transaction
        return DB::transaction(function () use ($user, $event, $award, $validatedNomineeScores, $request) {
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

            foreach ($validatedNomineeScores as $nomineeId => $data) {
                $vote = VotingVote::create([
                    'voter_id' => $user->id,
                    'voting_event_id' => $event->id,
                    'voting_award_id' => $award->id,
                    'voting_nominee_id' => $nomineeId,
                    'score' => $data['total'],
                    'rank' => null,
                    'voted_at' => $now,
                    'ip_address' => $ip,
                    'user_agent' => $userAgent,
                ]);

                foreach ($data['breakdown'] as $criterionId => $cScore) {
                    VotingVoteScore::create([
                        'voting_vote_id' => $vote->id,
                        'voting_criterion_id' => $criterionId,
                        'score' => $cScore,
                    ]);
                }
            }

            VotingAuditLog::log(
                action: $existingVotesCount > 0 ? 'vote.changed' : 'vote.cast',
                description: "User [{$user->email}] submitted criteria scores in award [{$award->name}]",
                auditable: $award,
                newValues: ['scores' => $validatedNomineeScores]
            );

            $msg = $existingVotesCount > 0
                ? "Your evaluation scores for {$award->name} have been successfully updated!"
                : "Evaluation scores successfully recorded for {$award->name}!";

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
                'score' => (float) $vote->score,
                'score_formatted' => number_format((float) $vote->score, 2),
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

                $totalPoints = $award->nominees->sum(fn ($nominee) => $nominee->votes->sum('score'));
                $distinctBallots = VotingVote::where('voting_award_id', $award->id)->distinct('voter_id')->count('voter_id');

                $sortedNominees = $award->getSortedNominees()
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
                    $totalPoints = $award->nominees->sum(fn ($nominee) => $nominee->votes->sum('score'));
                    $distinctBallots = VotingVote::where('voting_award_id', $award->id)->distinct('voter_id')->count('voter_id');

                    $sortedNominees = $award->getSortedNominees()
                        ->map(function (VotingNominee $nominee, int $index) use ($canReveal, $isRevealDateReached) {
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

    /**
     * Detailed computation breakdown and voter scores matrix for a specific award category.
     */
    public function tabulationBreakdown(Request $request, VotingAward $award): Response
    {
        $user = $request->user();
        $canReveal = $user && ($user->isAdmin() || (int) $user->id === 2);

        $award->load([
            'event.criteria' => fn ($q) => $q->orderBy('display_order')->orderBy('id'),
            'nominees.votes.voter',
            'nominees.votes.scores.criterion',
            'votes.voter',
            'votes.scores.criterion',
        ]);

        $event = $award->event;
        $isRevealDateReached = $event->isRevealDateReached();
        $shouldRevealNominee = $canReveal || $isRevealDateReached;

        $criteria = $event->criteria;
        $totalCriteriaScore = $criteria->sum('max_score') ?: 100;

        // Get ranked nominees using the standard 50% DC + 50% SH formula
        $sortedNominees = $award->getSortedNominees();

        // Build list of nominees with their computed stats
        $nomineesList = $sortedNominees->map(function (VotingNominee $nominee, int $index) use ($shouldRevealNominee) {
            $rank = $nominee->computed_rank ?? ($index + 1);

            return [
                'id' => $nominee->id,
                'name' => $shouldRevealNominee ? $nominee->name : ('Nominee #' . ($index + 1)),
                'photo_path' => $shouldRevealNominee ? $nominee->photo_path : '/images/user_unknown.png',
                'department' => $shouldRevealNominee ? $nominee->department : null,
                'organization' => $shouldRevealNominee ? $nominee->organization : null,
                'status' => $nominee->status,
                'dc_score' => (float) $nominee->dc_score,
                'dc_score_formatted' => number_format((float) $nominee->dc_score, 2),
                'dc_weighted_score' => (float) $nominee->dc_weighted_score,
                'dc_weighted_score_formatted' => number_format((float) $nominee->dc_weighted_score, 2),
                'dc_has_voted' => (bool) $nominee->dc_has_voted,
                'sh_count' => (int) $nominee->sh_count,
                'sh_total' => (float) $nominee->sh_total,
                'sh_total_formatted' => number_format((float) $nominee->sh_total, 2),
                'sh_average' => (float) $nominee->sh_average,
                'sh_average_formatted' => number_format((float) $nominee->sh_average, 2),
                'sh_weighted_score' => (float) $nominee->sh_weighted_score,
                'sh_weighted_score_formatted' => number_format((float) $nominee->sh_weighted_score, 2),
                'final_score' => (float) $nominee->final_score,
                'final_score_formatted' => number_format((float) $nominee->final_score, 2),
                'rank' => $rank,
                'is_winner' => $rank === 1,
                'is_tied' => (bool) ($nominee->is_tied ?? false),
                'is_masked' => ! $shouldRevealNominee,
            ];
        });

        // 1. Division Chief (voter_id = 2) scores per nominee & criteria
        $dcUser = User::find(2);
        $dcNomineeScores = [];
        foreach ($award->nominees as $nominee) {
            $dcVote = $nominee->votes->firstWhere('voter_id', 2);
            $criteriaMap = [];
            if ($dcVote) {
                foreach ($dcVote->scores as $scoreItem) {
                    $criteriaMap[$scoreItem->voting_criterion_id] = (float) $scoreItem->score;
                }
            }
            $dcNomineeScores[$nominee->id] = [
                'has_voted' => $dcVote !== null,
                'score' => $dcVote ? (float) $dcVote->score : null,
                'weighted_score' => $dcVote ? round((float) $dcVote->score * 0.50, 2) : 0.0,
                'criteria_scores' => $criteriaMap,
            ];
        }

        // 2. Section Heads (voters with voter_id != 2)
        $shVotesGroupedByVoter = $award->votes
            ->where('voter_id', '!=', 2)
            ->groupBy('voter_id');

        $sectionHeadsList = [];
        $shIndex = 1;

        foreach ($shVotesGroupedByVoter as $voterId => $voterVotes) {
            $firstVote = $voterVotes->first();
            $voter = $firstVote?->voter ?? User::find($voterId);

            $nomineeScores = [];
            foreach ($award->nominees as $nominee) {
                $nVote = $voterVotes->firstWhere('voting_nominee_id', $nominee->id);
                $critScores = [];
                if ($nVote) {
                    foreach ($nVote->scores as $sc) {
                        $critScores[$sc->voting_criterion_id] = (float) $sc->score;
                    }
                }
                $nomineeScores[$nominee->id] = [
                    'has_voted' => $nVote !== null,
                    'score' => $nVote ? (float) $nVote->score : null,
                    'criteria_scores' => $critScores,
                ];
            }

            $sectionHeadsList[] = [
                'voter_id' => $voterId,
                'display_number' => $shIndex++,
                'name' => $voter?->display_name ?? ('Voter #' . ($shIndex - 1)),
                'email' => $voter?->email,
                'designation' => $voter?->designation ?: ($voter?->position ?: null),
                'section' => $voter?->section ?: ($voter?->division ?: null),
                'department' => $voter?->section ?: ($voter?->division ?: ($voter?->department ?? null)),
                'scores' => $nomineeScores,
            ];
        }

        // Summary row for Section Heads matrix:
        $shSummary = [];
        foreach ($nomineesList as $nominee) {
            $nId = $nominee['id'];
            $shSummary[$nId] = [
                'total_score' => $nominee['sh_total_formatted'],
                'voters_count' => $nominee['sh_count'],
                'average_score' => $nominee['sh_average_formatted'],
                'weighted_score' => $nominee['sh_weighted_score_formatted'],
            ];
        }

        return Inertia::render('voting/tabulation-breakdown', [
            'event' => [
                'id' => $event->id,
                'title' => $event->title,
                'slug' => $event->slug,
                'status' => $event->computed_status,
                'reveal_date' => $event->reveal_date?->format('Y-m-d'),
                'is_closed' => $event->isClosed(),
            ],
            'award' => [
                'id' => $award->id,
                'name' => $award->name,
                'description' => $award->description,
                'status' => $award->status,
                'nominees_count' => $award->nominees->count(),
                'total_votes' => $award->nominees->sum(fn ($n) => $n->votes->sum('score')),
            ],
            'criteria' => $criteria->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'description' => $c->description,
                'max_score' => (float) $c->max_score,
                'display_order' => $c->display_order,
            ]),
            'total_criteria_score' => (float) $totalCriteriaScore,
            'nominees' => $nomineesList,
            'division_chief' => [
                'id' => 2,
                'name' => $dcUser ? $dcUser->display_name : 'Division Chief',
                'department' => $dcUser?->department ?? 'Division Chief Office',
                'scores' => $dcNomineeScores,
            ],
            'section_heads' => $sectionHeadsList,
            'section_heads_summary' => $shSummary,
            'can_reveal' => $canReveal || $isRevealDateReached,
            'is_reveal_date_reached' => $isRevealDateReached,
        ]);
    }
}
