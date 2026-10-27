<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $voter_id
 * @property int $voting_event_id
 * @property int $voting_award_id
 * @property int $voting_nominee_id
 * @property int $rank
 * @property Carbon $voted_at
 * @property string|null $ip_address
 * @property string|null $user_agent
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class VotingVote extends Model
{
    protected $table = 'voting_votes';

    protected $fillable = [
        'voter_id',
        'voting_event_id',
        'voting_award_id',
        'voting_nominee_id',
        'rank',
        'voted_at',
        'ip_address',
        'user_agent',
    ];

    protected function casts(): array
    {
        return [
            'rank' => 'integer',
            'voted_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function voter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'voter_id');
    }

    /**
     * @return BelongsTo<VotingEvent, $this>
     */
    public function event(): BelongsTo
    {
        return $this->belongsTo(VotingEvent::class, 'voting_event_id');
    }

    /**
     * @return BelongsTo<VotingAward, $this>
     */
    public function award(): BelongsTo
    {
        return $this->belongsTo(VotingAward::class, 'voting_award_id');
    }

    /**
     * @return BelongsTo<VotingNominee, $this>
     */
    public function nominee(): BelongsTo
    {
        return $this->belongsTo(VotingNominee::class, 'voting_nominee_id');
    }
}
