<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\VotingAuditLog;
use App\Models\VotingEvent;
use App\Models\VotingUserEligibility;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class VoterManagementController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->input('search');
        $role = $request->input('role');
        $eventId = $request->input('event_id');

        $users = User::query()
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->when($role, function ($query, $role) {
                if ($role === 'admin') {
                    $query->where(function ($q) {
                        $q->where('voting_role', 'admin')
                            ->orWhere('user_level_id', 1);
                    });
                } else {
                    $query->where('voting_role', '!=', 'admin')
                        ->where(function ($q) {
                            $q->whereNull('user_level_id')
                                ->orWhere('user_level_id', '!=', 1);
                        });
                }
            })
            ->withCount('votes')
            ->orderBy('id')
            ->paginate(15)
            ->withQueryString()
            ->through(function (User $user) use ($eventId) {
                $isEligible = true;

                if ($eventId) {
                    $eligibility = VotingUserEligibility::where('voting_event_id', $eventId)
                        ->where('user_id', $user->id)
                        ->first();
                    if ($eligibility) {
                        $isEligible = $eligibility->is_eligible;
                    }
                }

                return [
                    'id' => $user->id,
                    'name' => $user->display_name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'is_admin' => $user->isAdmin(),
                    'votes_count' => $user->votes_count,
                    'is_eligible' => $isEligible,
                ];
            });

        $events = VotingEvent::select('id', 'title')->orderByDesc('id')->get();

        return Inertia::render('admin/voters/index', [
            'users' => $users,
            'events' => $events,
            'filters' => [
                'search' => $search,
                'role' => $role,
                'event_id' => $eventId,
            ],
        ]);
    }

    public function toggleRole(Request $request, User $user): RedirectResponse
    {
        $currentUser = $request->user();

        if ($currentUser->id === $user->id) {
            return back()->with('error', 'You cannot alter your own administrative role.');
        }

        $newRole = $user->isAdmin() ? 'voter' : 'admin';
        $oldRole = $user->role;

        $user->update(['voting_role' => $newRole]);

        VotingAuditLog::log(
            action: 'user.role_changed',
            description: "Changed role of user [{$user->email}] from [{$oldRole}] to [{$newRole}]",
            auditable: $user,
            oldValues: ['voting_role' => $oldRole],
            newValues: ['voting_role' => $newRole]
        );

        return back()->with('success', "Role for {$user->display_name} updated to {$newRole}.");
    }

    public function toggleEligibility(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'voting_event_id' => ['required', 'exists:voting_events,id'],
            'is_eligible' => ['required', 'boolean'],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        VotingUserEligibility::updateOrCreate(
            [
                'voting_event_id' => $validated['voting_event_id'],
                'user_id' => $user->id,
            ],
            [
                'is_eligible' => $validated['is_eligible'],
                'reason' => $validated['reason'],
            ]
        );

        $status = $validated['is_eligible'] ? 'eligible' : 'ineligible';

        VotingAuditLog::log(
            action: 'user.eligibility_changed',
            description: "Marked user [{$user->email}] as [{$status}] for event #{$validated['voting_event_id']}",
            auditable: $user
        );

        return back()->with('success', "Voting eligibility updated for {$user->display_name}.");
    }
}
