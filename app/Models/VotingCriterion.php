<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int|null $voting_event_id
 * @property int|null $voting_award_id
 * @property string $name
 * @property string|null $description
 * @property float $max_score
 * @property int $display_order
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read VotingAward|null $award
 * @property-read VotingEvent|null $event
 * @property-read Collection<int, VotingVoteScore> $scores
 */
class VotingCriterion extends Model
{
    protected $table = 'voting_criteria';

    protected $fillable = [
        'voting_event_id',
        'voting_award_id',
        'name',
        'description',
        'max_score',
        'display_order',
    ];

    protected function casts(): array
    {
        return [
            'max_score' => 'float',
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
     * @return BelongsTo<VotingEvent, $this>
     */
    public function event(): BelongsTo
    {
        return $this->belongsTo(VotingEvent::class, 'voting_event_id');
    }

    /**
     * @return HasMany<VotingVoteScore, $this>
     */
    public function scores(): HasMany
    {
        return $this->hasMany(VotingVoteScore::class, 'voting_criterion_id');
    }
}
