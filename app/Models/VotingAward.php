<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $voting_event_id
 * @property string $name
 * @property string|null $description
 * @property string|null $image_path
 * @property Carbon|null $starts_at
 * @property Carbon|null $ends_at
 * @property bool|null $allow_vote_changes
 * @property string $results_visibility
 * @property string $status
 * @property int $display_order
 * @property int|null $nominees_count
 * @property int|null $votes_count
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Collection<int, VotingNominee> $nominees
 * @property-read Collection<int, VotingVote> $votes
 * @property-read VotingEvent $event
 */
class VotingAward extends Model
{
    protected $table = 'voting_awards';

    protected $fillable = [
        'voting_event_id',
        'name',
        'description',
        'image_path',
        'starts_at',
        'ends_at',
        'allow_vote_changes',
        'results_visibility',
        'status',
        'display_order',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'allow_vote_changes' => 'boolean',
            'display_order' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<VotingEvent, $this>
     */
    public function event(): BelongsTo
    {
        return $this->belongsTo(VotingEvent::class, 'voting_event_id');
    }

    /**
     * @return HasMany<VotingNominee, $this>
     */
    public function nominees(): HasMany
    {
        return $this->hasMany(VotingNominee::class, 'voting_award_id')->orderBy('display_order')->orderBy('id');
    }

    /**
     * @return HasMany<VotingNominee, $this>
     */
    public function activeNominees(): HasMany
    {
        return $this->hasMany(VotingNominee::class, 'voting_award_id')->where('status', 'active')->orderBy('display_order')->orderBy('id');
    }

    /**
     * @return HasMany<VotingVote, $this>
     */
    public function votes(): HasMany
    {
        return $this->hasMany(VotingVote::class, 'voting_award_id');
    }

    /**
     * Determine if voting is currently open for this specific award.
     */
    public function isOpen(): bool
    {
        if ($this->status !== 'active') {
            return false;
        }

        // Parent event must be open
        if (! $this->event->isOpen()) {
            return false;
        }

        $now = now();

        // Award's specific window cannot exceed parent event, but can be narrower
        if ($this->starts_at && $now->lt($this->starts_at)) {
            return false;
        }

        if ($this->ends_at && $now->gt($this->ends_at)) {
            return false;
        }

        return true;
    }

    /**
     * Determine if changing votes is permitted for this award.
     */
    public function allowsVoteChanges(): bool
    {
        if ($this->allow_vote_changes !== null) {
            return (bool) $this->allow_vote_changes;
        }

        return (bool) $this->event->allow_vote_changes;
    }

    /**
     * Determine if results can be viewed for this award.
     */
    public function canViewResults(?User $user = null): bool
    {
        if ($user && $user->isAdmin()) {
            return true;
        }

        if ($this->results_visibility === 'inherit') {
            return $this->event->canViewResults($user);
        }

        return match ($this->results_visibility) {
            'public' => true,
            'voters_only' => $user !== null,
            'after_closing' => $this->event->isClosed(),
            'hidden' => false,
            default => false,
        };
    }

    /**
     * Get nominees sorted and ranked:
     * Nominees with the same total points (average score) share the same rank and are marked as tied.
     *
     * @return \Illuminate\Support\Collection<int, VotingNominee>
     */
    public function getSortedNominees(): \Illuminate\Support\Collection
    {
        /** @var \Illuminate\Support\Collection<int, VotingNominee> $nominees */
        $nominees = $this->relationLoaded('nominees') ? $this->nominees : $this->nominees()->with('votes')->get();

        if ($nominees->isEmpty()) {
            return collect();
        }

        // Pre-compute vote stats for sorting performance
        $stats = [];
        foreach ($nominees as $nominee) {
            $votes = $nominee->relationLoaded('votes') ? $nominee->votes : $nominee->votes()->get();
            $totalPoints = (int) $votes->sum('rank');

            $stats[$nominee->id] = [
                'total_points' => $totalPoints,
            ];
        }

        $sorted = $nominees->sort(function (VotingNominee $a, VotingNominee $b) use ($stats) {
            $statsA = $stats[$a->id];
            $statsB = $stats[$b->id];

            // 1. Total points (average score) descending
            if ($statsA['total_points'] !== $statsB['total_points']) {
                return $statsB['total_points'] <=> $statsA['total_points'];
            }

            // 2. Display order ascending, then ID ascending
            if ($a->display_order !== $b->display_order) {
                return $a->display_order <=> $b->display_order;
            }

            return $a->id <=> $b->id;
        })->values();

        // Assign standard competition ranks and tie flags based on average/total score
        $currentRank = 1;
        foreach ($sorted as $i => $nominee) {
            if ($i === 0) {
                $nominee->computed_rank = 1;
                $nominee->is_tied = false;
            } else {
                $prev = $sorted[$i - 1];
                $statsPrev = $stats[$prev->id];
                $statsCurr = $stats[$nominee->id];

                $isTied = ($statsCurr['total_points'] === $statsPrev['total_points']);

                if ($isTied) {
                    $nominee->computed_rank = $currentRank;
                    $nominee->is_tied = true;
                    $prev->is_tied = true;
                } else {
                    $currentRank = $i + 1;
                    $nominee->computed_rank = $currentRank;
                    $nominee->is_tied = false;
                }
            }
        }

        return $sorted;
    }
}
