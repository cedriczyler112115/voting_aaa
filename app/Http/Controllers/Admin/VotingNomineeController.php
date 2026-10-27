<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\VotingAuditLog;
use App\Models\VotingAward;
use App\Models\VotingNominee;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class VotingNomineeController extends Controller
{
    public function store(Request $request, VotingAward $award): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'photo' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:5120'],
            'photo_path' => ['nullable', 'string', 'max:500'],
            'department' => ['nullable', 'string', 'max:255'],
            'organization' => ['nullable', 'string', 'max:255'],
            'status' => ['required', 'in:active,inactive'],
            'display_order' => ['integer', 'min:0'],
        ]);

        if ($request->hasFile('photo')) {
            $file = $request->file('photo');
            if ($file && ($path = $file->store('nominees', 'public'))) {
                $validated['photo_path'] = Storage::url($path);
            }
        }

        unset($validated['photo']);
        $validated['voting_award_id'] = $award->id;

        $nominee = VotingNominee::create($validated);

        VotingAuditLog::log(
            action: 'nominee.created',
            description: "Created nominee [{$nominee->name}] under award [{$award->name}]",
            auditable: $nominee,
            newValues: $nominee->toArray()
        );

        return back()->with('success', "Nominee '{$nominee->name}' created successfully.");
    }

    public function update(Request $request, VotingNominee $nominee): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'photo' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:5120'],
            'photo_path' => ['nullable', 'string', 'max:500'],
            'department' => ['nullable', 'string', 'max:255'],
            'organization' => ['nullable', 'string', 'max:255'],
            'status' => ['required', 'in:active,inactive'],
            'display_order' => ['integer', 'min:0'],
            'remove_photo' => ['nullable'],
        ]);

        if ($request->boolean('remove_photo')) {
            if ($nominee->photo_path && str_starts_with($nominee->photo_path, '/storage/nominees/')) {
                $oldPath = str_replace('/storage/', '', $nominee->photo_path);
                Storage::disk('public')->delete($oldPath);
            }
            $validated['photo_path'] = null;
        } elseif ($request->hasFile('photo')) {
            if ($nominee->photo_path && str_starts_with($nominee->photo_path, '/storage/nominees/')) {
                $oldPath = str_replace('/storage/', '', $nominee->photo_path);
                Storage::disk('public')->delete($oldPath);
            }
            $file = $request->file('photo');
            if ($file && ($path = $file->store('nominees', 'public'))) {
                $validated['photo_path'] = Storage::url($path);
            }
        }

        unset($validated['photo'], $validated['remove_photo']);

        $oldValues = $nominee->toArray();
        $nominee->update($validated);

        VotingAuditLog::log(
            action: 'nominee.updated',
            description: "Updated nominee [{$nominee->name}]",
            auditable: $nominee,
            oldValues: $oldValues,
            newValues: $nominee->toArray()
        );

        return back()->with('success', "Nominee '{$nominee->name}' updated successfully.");
    }

    public function destroy(VotingNominee $nominee): RedirectResponse
    {
        $votesCount = $nominee->votes()->count();

        if ($votesCount > 0) {
            return back()->with('error', "Cannot delete nominee '{$nominee->name}' because {$votesCount} vote(s) have been cast for them. You can deactivate them instead.");
        }

        if ($nominee->photo_path && str_starts_with($nominee->photo_path, '/storage/nominees/')) {
            $oldPath = str_replace('/storage/', '', $nominee->photo_path);
            Storage::disk('public')->delete($oldPath);
        }

        $name = $nominee->name;
        $nominee->delete();

        VotingAuditLog::log(
            action: 'nominee.deleted',
            description: "Deleted nominee [{$name}]",
            oldValues: ['name' => $name]
        );

        return back()->with('success', "Nominee '{$name}' was successfully deleted.");
    }
}
