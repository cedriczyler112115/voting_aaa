<?php

namespace Tests\Feature\Voting;

use App\Models\User;
use App\Models\VotingAward;
use App\Models\VotingCriterion;
use App\Models\VotingEvent;
use App\Models\VotingNominee;
use App\Models\VotingUserEligibility;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AwardCriteriaTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $voter;
    private VotingEvent $event;
    private VotingAward $awardA;
    private VotingAward $awardB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'voting_role' => 'admin',
            'email' => 'admin@example.com',
        ]);

        $this->voter = User::factory()->create([
            'voting_role' => 'voter',
            'email' => 'voter@example.com',
        ]);

        $this->event = VotingEvent::create([
            'title' => 'Annual Awards 2026',
            'status' => 'published',
            'starts_at' => now()->subDay(),
            'ends_at' => now()->addDays(5),
            'results_visibility' => 'public',
            'allow_vote_changes' => true,
        ]);

        VotingUserEligibility::create([
            'voting_event_id' => $this->event->id,
            'user_id' => $this->voter->id,
            'is_eligible' => true,
        ]);

        $this->awardA = VotingAward::create([
            'voting_event_id' => $this->event->id,
            'name' => 'Leadership Excellence Award',
            'status' => 'active',
            'display_order' => 1,
        ]);

        $this->awardB = VotingAward::create([
            'voting_event_id' => $this->event->id,
            'name' => 'Innovation Award',
            'status' => 'active',
            'display_order' => 2,
        ]);
    }

    public function test_admin_can_add_criterion_to_specific_award(): void
    {
        $this->actingAs($this->admin);

        $response = $this->post(route('admin.awards.criteria.store', $this->awardA), [
            'name' => 'Strategic Vision',
            'description' => 'Demonstrates long-term thinking and direction.',
            'max_score' => 50,
            'display_order' => 1,
        ]);

        $response->assertSessionHas('success');

        $this->assertDatabaseHas('voting_criteria', [
            'voting_award_id' => $this->awardA->id,
            'voting_event_id' => $this->event->id,
            'name' => 'Strategic Vision',
            'max_score' => 50,
        ]);

        // Award A has the criterion, but Award B does not
        $this->assertCount(1, $this->awardA->fresh()->criteria);
        $this->assertCount(0, $this->awardB->fresh()->criteria);
    }

    public function test_admin_can_copy_criteria_from_one_award_to_all_other_awards(): void
    {
        $this->actingAs($this->admin);

        // Add 2 criteria to Award A totaling 100%
        VotingCriterion::create([
            'voting_event_id' => $this->event->id,
            'voting_award_id' => $this->awardA->id,
            'name' => 'Performance',
            'max_score' => 60,
            'display_order' => 1,
        ]);
        VotingCriterion::create([
            'voting_event_id' => $this->event->id,
            'voting_award_id' => $this->awardA->id,
            'name' => 'Impact',
            'max_score' => 40,
            'display_order' => 2,
        ]);

        $this->assertCount(2, $this->awardA->fresh()->criteria);

        // Copy from Award A to all others
        $response = $this->post(route('admin.awards.criteria.copy-to-all', $this->awardA));
        $response->assertSessionHas('success');

        $this->assertCount(2, $this->awardB->fresh()->criteria);
        $this->assertEquals(100.0, $this->awardB->fresh()->total_criteria_score);
    }

    public function test_admin_can_update_and_delete_criterion(): void
    {
        $this->actingAs($this->admin);

        $criterion = VotingCriterion::create([
            'voting_event_id' => $this->event->id,
            'voting_award_id' => $this->awardA->id,
            'name' => 'Team Collaboration',
            'max_score' => 30,
            'display_order' => 1,
        ]);

        $this->put(route('admin.criteria.update', $criterion), [
            'name' => 'Enhanced Team Collaboration',
            'max_score' => 35,
            'display_order' => 2,
        ])->assertSessionHas('success');

        $this->assertDatabaseHas('voting_criteria', [
            'id' => $criterion->id,
            'name' => 'Enhanced Team Collaboration',
            'max_score' => 35,
        ]);

        $this->delete(route('admin.criteria.destroy', $criterion))
            ->assertSessionHas('success');

        $this->assertDatabaseMissing('voting_criteria', [
            'id' => $criterion->id,
        ]);
    }

    public function test_voter_scores_nominee_using_award_criteria(): void
    {
        $criterion1 = VotingCriterion::create([
            'voting_event_id' => $this->event->id,
            'voting_award_id' => $this->awardA->id,
            'name' => 'Technical Competence',
            'max_score' => 50,
            'display_order' => 1,
        ]);
        $criterion2 = VotingCriterion::create([
            'voting_event_id' => $this->event->id,
            'voting_award_id' => $this->awardA->id,
            'name' => 'Communication',
            'max_score' => 50,
            'display_order' => 2,
        ]);

        $nominee = VotingNominee::create([
            'voting_award_id' => $this->awardA->id,
            'name' => 'Jane Doe',
            'status' => 'active',
        ]);

        $this->actingAs($this->voter);

        $response = $this->post('/voting/save-nominee-score', [
            'voting_award_id' => $this->awardA->id,
            'voting_nominee_id' => $nominee->id,
            'scores' => [
                $criterion1->id => 45,
                $criterion2->id => 48,
            ],
        ]);

        $response->assertSessionHas('success');

        $this->assertDatabaseHas('voting_votes', [
            'voter_id' => $this->voter->id,
            'voting_award_id' => $this->awardA->id,
            'voting_nominee_id' => $nominee->id,
            'score' => 93.0,
        ]);

        $this->assertDatabaseCount('voting_vote_scores', 2);
    }

    public function test_voter_can_view_event_page_with_award_criteria(): void
    {
        VotingCriterion::create([
            'voting_event_id' => $this->event->id,
            'voting_award_id' => $this->awardA->id,
            'name' => 'Competence',
            'max_score' => 100,
            'display_order' => 1,
        ]);

        VotingNominee::create([
            'voting_award_id' => $this->awardA->id,
            'name' => 'Jane Doe',
            'status' => 'active',
        ]);

        $this->actingAs($this->voter);

        $response = $this->get(route('voting.show', $this->event->slug));
        $response->assertOk();
    }
}
