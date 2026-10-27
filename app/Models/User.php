<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string|null $name
 * @property string|null $first_name
 * @property string|null $last_name
 * @property string $email
 * @property string $voting_role
 * @property string $display_name
 * @property string $role
 * @property int|null $votes_count
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property int|null $user_level_id
 * @property string|null $google_id
 * @property string|null $avatar
 * @property int|null $is_status
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'first_name', 'last_name', 'email', 'voting_role', 'password', 'google_id', 'avatar', 'is_status'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_status' => 'integer',
        ];
    }

    /**
     * Get user display name.
     */
    public function getDisplayNameAttribute(): string
    {
        if (! empty($this->name)) {
            return $this->name;
        }

        $combined = trim(($this->first_name ?? '').' '.($this->last_name ?? ''));

        return $combined !== '' ? $combined : $this->email;
    }

    /**
     * Check if user is an administrator.
     */
    public function isAdmin(): bool
    {
        return $this->voting_role === 'admin' || (isset($this->user_level_id) && (int) $this->user_level_id === 1);
    }

    /**
     * Check if user is a voter.
     */
    public function isVoter(): bool
    {
        return ! $this->isAdmin();
    }

    /**
     * Get resolved role name.
     */
    public function getRoleAttribute(): string
    {
        return $this->isAdmin() ? 'admin' : 'voter';
    }

    /**
     * User's cast votes.
     *
     * @return HasMany<VotingVote, $this>
     */
    public function votes(): HasMany
    {
        return $this->hasMany(VotingVote::class, 'voter_id');
    }

    /**
     * User's audit log entries.
     *
     * @return HasMany<VotingAuditLog, $this>
     */
    public function auditLogs(): HasMany
    {
        return $this->hasMany(VotingAuditLog::class, 'user_id');
    }

    /**
     * Voting events created by user.
     *
     * @return HasMany<VotingEvent, $this>
     */
    public function createdVotingEvents(): HasMany
    {
        return $this->hasMany(VotingEvent::class, 'created_by');
    }
}
