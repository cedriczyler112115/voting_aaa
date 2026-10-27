<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $voting_event_id
 * @property int $user_id
 * @property bool $is_eligible
 * @property string|null $reason
 */
class VotingUserEligibility extends Model
{
    protected $table = 'voting_user_eligibilities';

    protected $fillable = [
        'voting_event_id',
        'user_id',
        'is_eligible',
        'reason',
    ];

    protected function casts(): array
    {
        return [
            'is_eligible' => 'boolean',
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
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
