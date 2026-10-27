<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\VotingAuditLog;
use App\Models\VotingAward;
use App\Models\VotingEvent;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class VotingAwardController extends Controller
{
    public function store(Request $request, VotingEvent $event): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'image_path' => ['nullable', 'string', 'max:500'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'allow_vote_changes' => ['nullable', 'boolean'],
            'results_visibility' => ['required', 'in:inherit,public,voters_only,after_closing,hidden'],
            'status' => ['required', 'in:active,inactive'],
            'display_order' => ['integer', 'min:0'],
        ]);

        $validated['voting_event_id'] = $event->id;

        $award = VotingAward::create($validated);

        VotingAuditLog::log(
            action: 'award.created',
            description: "Created award [{$award->name}] under event [{$event->title}]",
            auditable: $award,
            newValues: $award->toArray()
        );

        return back()->with('success', "Award '{$award->name}' created successfully.");
    }

    public function update(Request $request, VotingAward $award): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'image_path' => ['nullable', 'string', 'max:500'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'allow_vote_changes' => ['nullable', 'boolean'],
            'results_visibility' => ['required', 'in:inherit,public,voters_only,after_closing,hidden'],
            'status' => ['required', 'in:active,inactive'],
            'display_order' => ['integer', 'min:0'],
        ]);

        $oldValues = $award->toArray();
        $award->update($validated);

        VotingAuditLog::log(
            action: 'award.updated',
            description: "Updated award [{$award->name}]",
            auditable: $award,
            oldValues: $oldValues,
            newValues: $award->toArray()
        );

        return back()->with('success', "Award '{$award->name}' updated successfully.");
    }

    public function destroy(VotingAward $award): RedirectResponse
    {
        $votesCount = $award->votes()->count();

        if ($votesCount > 0) {
            return back()->with('error', "Cannot delete award '{$award->name}' because {$votesCount} vote(s) have already been cast. You can set it to inactive instead.");
        }

        $name = $award->name;
        $award->delete();

        VotingAuditLog::log(
            action: 'award.deleted',
            description: "Deleted award [{$name}]",
            oldValues: ['name' => $name]
        );

        return back()->with('success', "Award '{$name}' was successfully deleted.");
    }
}
