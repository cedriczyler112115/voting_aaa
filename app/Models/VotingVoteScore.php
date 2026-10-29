<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $voting_vote_id
 * @property int $voting_criterion_id
 * @property float $score
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read VotingVote $vote
 * @property-read VotingCriterion $criterion
 */
class VotingVoteScore extends Model
{
    protected $table = 'voting_vote_scores';

    protected $fillable = [
        'voting_vote_id',
        'voting_criterion_id',
        'score',
    ];

    protected function casts(): array
    {
        return [
            'score' => 'float',
        ];
    }

    /**
     * @return BelongsTo<VotingVote, $this>
     */
    public function vote(): BelongsTo
    {
        return $this->belongsTo(VotingVote::class, 'voting_vote_id');
    }

    /**
     * @return BelongsTo<VotingCriterion, $this>
     */
    public function criterion(): BelongsTo
    {
        return $this->belongsTo(VotingCriterion::class, 'voting_criterion_id');
    }
}
