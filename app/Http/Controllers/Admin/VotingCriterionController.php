<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\VotingAuditLog;
use App\Models\VotingCriterion;
use App\Models\VotingEvent;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class VotingCriterionController extends Controller
{
    /**
     * Store a newly created criterion for an event.
     */
    public function store(Request $request, VotingEvent $event): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'max_score' => ['required', 'numeric', 'min:1', 'max:100'],
            'display_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $validated['display_order'] = $validated['display_order'] ?? ($event->criteria()->count() + 1);

        $criterion = $event->criteria()->create($validated);

        VotingAuditLog::log(
            action: 'criterion.created',
            description: "Added criterion [{$criterion->name}] with max score [{$criterion->max_score}] to event [{$event->title}]",
            auditable: $event,
            newValues: $criterion->toArray()
        );

        $totalScore = $event->criteria()->sum('max_score');
        $msg = "Criterion '{$criterion->name}' added successfully. Current total weight: {$totalScore}%.";

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

        VotingAuditLog::log(
            action: 'criterion.updated',
            description: "Updated criterion [{$criterion->name}] in event [{$criterion->event->title}]",
            auditable: $criterion->event,
            oldValues: $oldValues,
            newValues: $criterion->toArray()
        );

        $totalScore = $criterion->event->criteria()->sum('max_score');

        return back()->with('success', "Criterion updated successfully. Current total weight: {$totalScore}%.");
    }

    /**
     * Delete a criterion.
     */
    public function destroy(VotingCriterion $criterion): RedirectResponse
    {
        $event = $criterion->event;
        $name = $criterion->name;

        $criterion->delete();

        VotingAuditLog::log(
            action: 'criterion.deleted',
            description: "Deleted criterion [{$name}] from event [{$event->title}]",
            auditable: $event
        );

        $totalScore = $event->criteria()->sum('max_score');

        return back()->with('success', "Criterion '{$name}' deleted. Current total weight: {$totalScore}%.");
    }

    /**
     * Quick-load standard ANINAG sample evaluation criteria totaling 100%.
     */
    public function loadDefaults(VotingEvent $event): RedirectResponse
    {
        $defaultCriteria = [
            [
                'name' => 'Exemplary Work Performance',
                'description' => 'Quality, consistency, and dedication to duty and responsibilities.',
                'max_score' => 40,
                'display_order' => 1,
            ],
            [
                'name' => 'Commendable and Unique Contributions',
                'description' => 'Significant innovations, problem-solving, and beyond-call initiatives.',
                'max_score' => 20,
                'display_order' => 2,
            ],
            [
                'name' => 'Leadership and Staff Engagement',
                'description' => 'Team mentorship, positive influence, and motivating peers.',
                'max_score' => 20,
                'display_order' => 3,
            ],
            [
                'name' => 'Stakeholder Coordination and Partnership Building',
                'description' => 'Collaborative engagement with partners, beneficiaries, and stakeholders.',
                'max_score' => 10,
                'display_order' => 4,
            ],
            [
                'name' => 'Commitment to Learning and Integrity in Public Service',
                'description' => 'Ethics, professionalism, and continuous self-improvement.',
                'max_score' => 10,
                'display_order' => 5,
            ],
        ];

        foreach ($defaultCriteria as $item) {
            $event->criteria()->create($item);
        }

        VotingAuditLog::log(
            action: 'criterion.defaults_loaded',
            description: "Loaded 5 standard evaluation criteria totaling 100% for event [{$event->title}]",
            auditable: $event
        );

        return back()->with('success', '5 standard criteria totaling 100% have been loaded successfully.');
    }
}
