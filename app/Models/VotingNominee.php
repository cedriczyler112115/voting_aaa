<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $voting_award_id
 * @property string $name
 * @property string|null $description
 * @property string|null $photo_path
 * @property string|null $department
 * @property string|null $organization
 * @property string $status
 * @property int $display_order
 * @property int|null $votes_count
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read VotingAward $award
 * @property-read Collection<int, VotingVote> $votes
 */
class VotingNominee extends Model
{
    protected $table = 'voting_nominees';

    protected $fillable = [
        'voting_award_id',
        'name',
        'description',
        'photo_path',
        'department',
        'organization',
        'status',
        'display_order',
    ];

    protected function casts(): array
    {
        return [
            'display_order' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<VotingAward, $this>
     */
    public function award(): BelongsTo
    {
        return $this->belongsTo(VotingAward::class, 'voting_award_id');
    }

    /**
     * @return HasMany<VotingVote, $this>
     */
    public function votes(): HasMany
    {
        return $this->hasMany(VotingVote::class, 'voting_nominee_id');
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function getPhotoUrlAttribute(): ?string
    {
        if (empty($this->photo_path)) {
            return null;
        }

        if (str_starts_with($this->photo_path, 'http://') || str_starts_with($this->photo_path, 'https://')) {
            return $this->photo_path;
        }

        if (str_starts_with($this->photo_path, '/')) {
            return $this->photo_path;
        }

        return '/'.ltrim($this->photo_path, '/');
    }
}
