<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\VotingAuditLog;
use App\Models\VotingAward;
use App\Models\VotingCriterion;
use App\Models\VotingEvent;
use App\Models\VotingNominee;
use App\Models\VotingUserEligibility;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class VotingEventController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->input('search');
        $status = $request->input('status');

        $events = VotingEvent::query()
            ->withCount(['awards', 'votes'])
            ->when($search, function ($query, $search) {
                $query->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            })
            ->when($status, function ($query, $status) {
                $query->where('status', $status);
            })
            ->orderByDesc('created_at')
            ->paginate(10)
            ->withQueryString()
            ->through(fn (VotingEvent $event) => [
                'id' => $event->id,
                'title' => $event->title,
                'slug' => $event->slug,
                'description' => $event->description,
                'banner_path' => $event->banner_path,
                'status' => $event->status,
                'computed_status' => $event->computed_status,
                'starts_at' => $event->starts_at?->format('Y-m-d H:i'),
                'ends_at' => $event->ends_at?->format('Y-m-d H:i'),
                'reveal_date' => $event->reveal_date?->format('Y-m-d'),
                'results_visibility' => $event->results_visibility,
                'allow_vote_changes' => $event->allow_vote_changes,
                'awards_count' => $event->awards_count,
                'votes_count' => $event->votes_count,
                'created_at' => $event->created_at->format('M d, Y'),
            ]);

        return Inertia::render('admin/events/index', [
            'events' => $events,
            'filters' => [
                'search' => $search,
                'status' => $status,
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'unique:voting_events,slug'],
            'description' => ['nullable', 'string'],
            'banner_path' => ['nullable', 'string', 'max:500'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'reveal_date' => ['nullable', 'date'],
            'status' => ['required', 'in:draft,scheduled,published,closed,archived'],
            'results_visibility' => ['required', 'in:public,voters_only,after_closing,hidden'],
            'allow_vote_changes' => ['boolean'],
        ]);

        if (empty($validated['slug'])) {
            $baseSlug = Str::slug($validated['title']);
            $slug = $baseSlug;
            $counter = 1;
            while (VotingEvent::where('slug', $slug)->exists()) {
                $slug = "{$baseSlug}-".$counter++;
            }
            $validated['slug'] = $slug;
        }

        $validated['created_by'] = $request->user()->id;

        $event = VotingEvent::create($validated);

        VotingAuditLog::log(
            action: 'event.created',
            description: "Created voting event [{$event->title}]",
            auditable: $event,
            newValues: $event->toArray()
        );

        return redirect()->route('admin.events.show', $event)->with('success', 'Voting event created successfully.');
    }

    public function show(VotingEvent $event): Response
    {
        $event->load([
            'criteria',
            'awards' => function ($q) {
                $q->withCount(['nominees', 'votes'])
                    ->orderBy('display_order')
                    ->orderBy('id')
                    ->with([
                        'criteria' => function ($cq) {
                            $cq->orderBy('display_order')->orderBy('id');
                        },
                        'nominees' => function ($nq) {
                            $nq->withCount('votes')
                                ->orderBy('display_order')
                                ->orderBy('id');
                        },
                    ]);
            },
            'creator',
        ]);

        $allowedVoters = $event->eligibilities()
            ->with('user')
            ->orderByDesc('id')
            ->get()
            ->map(fn (VotingUserEligibility $el) => [
                'id' => $el->id,
                'user_id' => $el->user_id,
                'name' => $el->user ? $el->user->display_name : 'User #'.$el->user_id,
                'email' => $el->user ? $el->user->email : '',
                'role' => $el->user ? $el->user->role : 'voter',
                'is_eligible' => (bool) $el->is_eligible,
                'reason' => $el->reason,
                'created_at' => $el->created_at?->format('M d, Y H:i'),
            ]);

        $allUsers = User::query()
            ->where('is_status', 1)
            ->select('id', 'name', 'first_name', 'last_name', 'email', 'voting_role', 'position', 'section', 'division')
            ->orderByRaw('COALESCE(NULLIF(name, ""), CONCAT(first_name, " ", last_name)) ASC')
            ->get()
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->display_name,
                'email' => $u->email,
                'role' => $u->role,
                'position' => $u->position,
                'department' => $u->section ?: $u->division,
            ]);

        return Inertia::render('admin/events/show', [
            'event' => [
                'id' => $event->id,
                'title' => $event->title,
                'slug' => $event->slug,
                'description' => $event->description,
                'banner_path' => $event->banner_path,
                'status' => $event->status,
                'computed_status' => $event->computed_status,
                'starts_at' => $event->starts_at?->format('Y-m-d\TH:i'),
                'ends_at' => $event->ends_at?->format('Y-m-d\TH:i'),
                'reveal_date' => $event->reveal_date?->format('Y-m-d'),
                'results_visibility' => $event->results_visibility,
                'allow_vote_changes' => $event->allow_vote_changes,
                'created_by' => $event->creator ? $event->creator->display_name : 'System',
                'created_at' => $event->created_at->format('M d, Y H:i'),
                'total_awards' => $event->awards->count(),
                'total_votes' => $event->awards->sum('votes_count'),
                'total_criteria_score' => (float) $event->criteria->sum('max_score'),
                'criteria' => $event->criteria->map(fn (VotingCriterion $c) => [
                    'id' => $c->id,
                    'name' => $c->name,
                    'description' => $c->description,
                    'max_score' => (float) $c->max_score,
                    'display_order' => $c->display_order,
                ]),
                'allowed_voters_count' => $allowedVoters->where('is_eligible', true)->count(),
                'allowed_voters' => $allowedVoters,
                'awards' => $event->awards->map(fn (VotingAward $award) => [
                    'id' => $award->id,
                    'name' => $award->name,
                    'description' => $award->description,
                    'image_path' => $award->image_path,
                    'starts_at' => $award->starts_at?->format('Y-m-d\TH:i'),
                    'ends_at' => $award->ends_at?->format('Y-m-d\TH:i'),
                    'status' => $award->status,
                    'allow_vote_changes' => $award->allow_vote_changes,
                    'results_visibility' => $award->results_visibility,
                    'display_order' => $award->display_order,
                    'nominees_count' => $award->nominees_count,
                    'votes_count' => $award->votes_count,
                    'total_criteria_score' => (float) $award->criteria->sum('max_score'),
                    'criteria' => $award->criteria->map(fn (VotingCriterion $c) => [
                        'id' => $c->id,
                        'voting_award_id' => $c->voting_award_id,
                        'name' => $c->name,
                        'description' => $c->description,
                        'max_score' => (float) $c->max_score,
                        'display_order' => $c->display_order,
                    ]),
                    'nominees' => $award->nominees->map(fn (VotingNominee $nominee) => [
                        'id' => $nominee->id,
                        'name' => $nominee->name,
                        'description' => $nominee->description,
                        'photo_path' => $nominee->photo_path,
                        'department' => $nominee->department,
                        'organization' => $nominee->organization,
                        'status' => $nominee->status,
                        'display_order' => $nominee->display_order,
                        'votes_count' => $nominee->votes_count,
                    ]),
                ]),
            ],
            'all_users' => $allUsers,
        ]);
    }

    public function update(Request $request, VotingEvent $event): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'unique:voting_events,slug,'.$event->id],
            'description' => ['nullable', 'string'],
            'banner_path' => ['nullable', 'string', 'max:500'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'reveal_date' => ['nullable', 'date'],
            'status' => ['required', 'in:draft,scheduled,published,closed,archived'],
            'results_visibility' => ['required', 'in:public,voters_only,after_closing,hidden'],
            'allow_vote_changes' => ['boolean'],
        ]);

        if (empty($validated['slug'])) {
            $validated['slug'] = Str::slug($validated['title']);
        }

        $oldValues = $event->toArray();
        $event->update($validated);

        VotingAuditLog::log(
            action: 'event.updated',
            description: "Updated voting event [{$event->title}]",
            auditable: $event,
            oldValues: $oldValues,
            newValues: $event->toArray()
        );

        return back()->with('success', 'Voting event updated successfully.');
    }

    public function updateStatus(Request $request, VotingEvent $event): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:draft,scheduled,published,closed,archived'],
        ]);

        $oldStatus = $event->status;
        $event->update(['status' => $validated['status']]);

        VotingAuditLog::log(
            action: 'event.status_changed',
            description: "Changed status of [{$event->title}] from [{$oldStatus}] to [{$validated['status']}]",
            auditable: $event,
            oldValues: ['status' => $oldStatus],
            newValues: ['status' => $validated['status']]
        );

        return back()->with('success', "Event status changed to {$validated['status']}.");
    }

    public function destroy(VotingEvent $event): RedirectResponse
    {
        $votesCount = $event->votes()->count();

        if ($votesCount > 0) {
            return back()->with('error', "Cannot delete event '{$event->title}' because {$votesCount} vote(s) have already been cast. You may archive or close the event instead.");
        }

        $title = $event->title;
        $event->delete();

        VotingAuditLog::log(
            action: 'event.deleted',
            description: "Deleted voting event [{$title}]",
            oldValues: ['title' => $title]
        );

        return redirect()->route('admin.events.index')->with('success', "Voting event '{$title}' was successfully deleted.");
    }

    public function addVoters(Request $request, VotingEvent $event): RedirectResponse
    {
        $validated = $request->validate([
            'user_ids' => ['required', 'array', 'min:1'],
            'user_ids.*' => ['integer', 'exists:users,id'],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $count = 0;
        foreach ($validated['user_ids'] as $userId) {
            VotingUserEligibility::updateOrCreate(
                [
                    'voting_event_id' => $event->id,
                    'user_id' => $userId,
                ],
                [
                    'is_eligible' => true,
                    'reason' => $validated['reason'] ?? 'Added to allowed voter list',
                ]
            );
            $count++;
        }

        VotingAuditLog::log(
            action: 'event.voters_added',
            description: "Added {$count} user(s) to allowed voter list for event [{$event->title}]",
            auditable: $event,
            newValues: ['user_ids' => $validated['user_ids']]
        );

        return back()->with('success', "Added {$count} user(s) to the authorized voters list for this event.");
    }

    public function removeVoter(VotingEvent $event, User $user): RedirectResponse
    {
        VotingUserEligibility::where('voting_event_id', $event->id)
            ->where('user_id', $user->id)
            ->delete();

        VotingAuditLog::log(
            action: 'event.voter_removed',
            description: "Removed user [{$user->email}] from allowed voters list for event [{$event->title}]",
            auditable: $event
        );

        return back()->with('success', "Removed {$user->display_name} from the allowed voters list.");
    }

    public function allowAllVoters(VotingEvent $event): RedirectResponse
    {
        $users = User::where('is_status', 1)->select('id')->get();
        $records = $users->map(fn (User $u) => [
            'voting_event_id' => $event->id,
            'user_id' => $u->id,
            'is_eligible' => true,
            'reason' => 'All users enrolled by administrator',
            'created_at' => now(),
            'updated_at' => now(),
        ])->toArray();

        VotingUserEligibility::upsert(
            $records,
            ['voting_event_id', 'user_id'],
            ['is_eligible', 'reason', 'updated_at']
        );

        VotingAuditLog::log(
            action: 'event.all_voters_allowed',
            description: "Enrolled all {$users->count()} users as allowed voters for event [{$event->title}]",
            auditable: $event
        );

        return back()->with('success', "All {$users->count()} registered users are now authorized to vote in this event.");
    }

    public function clearAllowedVoters(VotingEvent $event): RedirectResponse
    {
        $deleted = VotingUserEligibility::where('voting_event_id', $event->id)->delete();

        VotingAuditLog::log(
            action: 'event.voters_cleared',
            description: "Cleared all ({$deleted}) allowed voters for event [{$event->title}]",
            auditable: $event
        );

        return back()->with('success', 'Cleared all authorized voters for this event.');
    }
}
