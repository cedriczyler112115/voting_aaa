<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\VotingAuditLog;
use App\Models\VotingAward;
use App\Models\VotingCriterion;
use App\Models\VotingEvent;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class VotingCriterionController extends Controller
{
    /**
     * Store a newly created criterion for an award category.
     */
    public function store(Request $request, VotingAward $award): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'max_score' => ['required', 'numeric', 'min:1', 'max:100'],
            'display_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $validated['display_order'] = $validated['display_order'] ?? ($award->criteria()->count() + 1);
        $validated['voting_event_id'] = $award->voting_event_id;

        $criterion = $award->criteria()->create($validated);

        VotingAuditLog::log(
            action: 'criterion.created',
            description: "Added criterion [{$criterion->name}] with max score [{$criterion->max_score}] to award [{$award->name}]",
            auditable: $award,
            newValues: $criterion->toArray()
        );

        $totalScore = $award->criteria()->sum('max_score');
        $msg = "Criterion '{$criterion->name}' added successfully to '{$award->name}'. Current total weight: {$totalScore}%.";

        return back()->with('success', $msg);
    }

    /**
     * Update an existing criterion.
     */
    public function update(Request $request, VotingCriterion $criterion): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'max_score' => ['required', 'numeric', 'min:1', 'max:100'],
            'display_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $oldValues = $criterion->toArray();
        $criterion->update($validated);

        $award = $criterion->award;

        VotingAuditLog::log(
            action: 'criterion.updated',
            description: "Updated criterion [{$criterion->name}] in award [" . ($award?->name ?? 'Unknown') . "]",
            auditable: $award ?? $criterion->event,
            oldValues: $oldValues,
            newValues: $criterion->toArray()
        );

        $totalScore = $award ? $award->criteria()->sum('max_score') : 0;

        return back()->with('success', "Criterion updated successfully. Current total weight: {$totalScore}%.");
    }

    /**
     * Delete a criterion.
     */
    public function destroy(VotingCriterion $criterion): RedirectResponse
    {
        $award = $criterion->award;
        $name = $criterion->name;

        $criterion->delete();

        VotingAuditLog::log(
            action: 'criterion.deleted',
            description: "Deleted criterion [{$name}] from award [" . ($award?->name ?? 'Unknown') . "]",
            auditable: $award ?? $criterion->event
        );

        $totalScore = $award ? $award->criteria()->sum('max_score') : 0;

        return back()->with('success', "Criterion '{$name}' deleted. Current total weight: {$totalScore}%.");
    }

    /**
     * Copy criteria from this award to all other awards in the same event.
     */
    public function copyToAll(VotingAward $award): RedirectResponse
    {
        $criteria = $award->criteria;

        if ($criteria->isEmpty()) {
            return back()->with('error', "The award '{$award->name}' has no criteria to copy.");
        }

        $otherAwards = VotingAward::query()
            ->where('voting_event_id', $award->voting_event_id)
            ->where('id', '!=', $award->id)
            ->get();

        if ($otherAwards->isEmpty()) {
            return back()->with('error', 'There are no other awards in this event to copy criteria to.');
        }

        $copiedCount = 0;
        foreach ($otherAwards as $targetAward) {
            // Delete existing criteria for target award to avoid duplicates
            $targetAward->criteria()->delete();

            foreach ($criteria as $crit) {
                $targetAward->criteria()->create([
                    'voting_event_id' => $targetAward->voting_event_id,
                    'name' => $crit->name,
                    'description' => $crit->description,
                    'max_score' => $crit->max_score,
                    'display_order' => $crit->display_order,
                ]);
            }
            $copiedCount++;
        }

        VotingAuditLog::log(
            action: 'criterion.copied_to_all',
            description: "Copied criteria from award [{$award->name}] to {$copiedCount} other awards in event [{$award->event->title}]",
            auditable: $award
        );

        return back()->with('success', "Criteria copied from '{$award->name}' to all {$copiedCount} other awards in this event.");
    }
}
