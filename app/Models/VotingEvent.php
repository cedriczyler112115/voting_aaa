<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property string $title
 * @property string $slug
 * @property string|null $description
 * @property string|null $banner_path
 * @property Carbon|null $starts_at
 * @property Carbon|null $ends_at
 * @property string $status
 * @property string $results_visibility
 * @property bool $allow_vote_changes
 * @property int|null $created_by
 * @property int|null $awards_count
 * @property int|null $votes_count
 * @property string $computed_status
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Collection<int, VotingAward> $awards
 * @property-read Collection<int, VotingVote> $votes
 * @property-read User|null $creator
 */
class VotingEvent extends Model
{
    protected $table = 'voting_events';

    protected $fillable = [
        'title',
        'slug',
        'description',
        'banner_path',
        'starts_at',
        'ends_at',
        'reveal_date',
        'status',
        'results_visibility',
        'allow_vote_changes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'reveal_date' => 'date',
            'allow_vote_changes' => 'boolean',
        ];
    }

    /**
     * Determine if reveal date is reached (on the day and after).
     */
    public function isRevealDateReached(): bool
    {
        if (! $this->reveal_date) {
            return false;
        }

        return now()->toDateString() >= $this->reveal_date->toDateString();
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (VotingEvent $event) {
            if (empty($event->slug)) {
                $baseSlug = Str::slug($event->title);
                $slug = $baseSlug;
                $counter = 1;
                while (static::where('slug', $slug)->exists()) {
                    $slug = "{$baseSlug}-".$counter++;
                }
                $event->slug = $slug;
            }
        });
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return HasMany<VotingAward, $this>
     */
    public function awards(): HasMany
    {
        return $this->hasMany(VotingAward::class, 'voting_event_id')->orderBy('display_order')->orderBy('id');
    }

    /**
     * @return HasMany<VotingVote, $this>
     */
    public function votes(): HasMany
    {
        return $this->hasMany(VotingVote::class, 'voting_event_id');
    }

    /**
     * @return HasMany<VotingUserEligibility, $this>
     */
    public function eligibilities(): HasMany
    {
        return $this->hasMany(VotingUserEligibility::class, 'voting_event_id');
    }

    /**
     * Compute current operational status.
     */
    public function getComputedStatusAttribute(): string
    {
        if (in_array($this->status, ['draft', 'archived', 'closed'])) {
            return $this->status;
        }

        $now = now();

        if ($this->starts_at && $now->lt($this->starts_at)) {
            return 'scheduled';
        }

        if ($this->ends_at && $now->gt($this->ends_at)) {
            return 'closed';
        }

        return 'published';
    }

    /**
     * Determine if voting is currently open.
     */
    public function isOpen(): bool
    {
        if ($this->status !== 'published') {
            return false;
        }

        $now = now();

        if ($this->starts_at && $now->lt($this->starts_at)) {
            return false;
        }

        if ($this->ends_at && $now->gt($this->ends_at)) {
            return false;
        }

        return true;
    }

    /**
     * Determine if voting hasn't started yet.
     */
    public function isUpcoming(): bool
    {
        if ($this->status === 'draft' || $this->status === 'archived' || $this->status === 'closed') {
            return false;
        }

        return $this->status === 'scheduled' || ($this->starts_at && now()->lt($this->starts_at));
    }

    /**
     * Determine if event has ended.
     */
    public function isClosed(): bool
    {
        return $this->status === 'closed' || ($this->ends_at && now()->gt($this->ends_at));
    }

    /**
     * Determine if a user is eligible to vote in this event.
     * Criteria: In every Event there must be an explicit list of allowed voters.
     */
    public function isUserEligible(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        return $this->eligibilities()
            ->where('user_id', $user->id)
            ->where('is_eligible', true)
            ->exists();
    }

    /**
     * Determine if results can be viewed by the user.
     */
    public function canViewResults(?User $user = null): bool
    {
        if ($user && $user->isAdmin()) {
            return true;
        }

        return match ($this->results_visibility) {
            'public' => true,
            'voters_only' => $user !== null,
            'after_closing' => $this->isClosed(),
            'hidden' => false,
            default => false,
        };
    }
}
