<?php

namespace Tests\Feature\Voting;

use App\Models\User;
use App\Models\VotingAward;
use App\Models\VotingEvent;
use App\Models\VotingNominee;
use App\Models\VotingVote;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class VotingSystemTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $voter;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'voting_role' => 'admin',
            'email' => 'admin@test.com',
        ]);

        $this->voter = User::factory()->create([
            'voting_role' => 'voter',
            'email' => 'voter@test.com',
        ]);
    }

    /**
     * 1. Admin can create a voting title/event.
     */
    public function test_admin_can_create_voting_event(): void
    {
        $this->actingAs($this->admin);

        $response = $this->post(route('admin.events.store'), [
            'title' => 'Annual Recognition Awards 2026',
            'description' => 'Honoring outstanding employees across all divisions.',
            'status' => 'published',
            'results_visibility' => 'public',
            'allow_vote_changes' => false,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('voting_events', [
            'title' => 'Annual Recognition Awards 2026',
            'slug' => 'annual-recognition-awards-2026',
            'status' => 'published',
            'created_by' => $this->admin->id,
        ]);
    }

    /**
     * 2. Admin can create awards within voting title.
     */
    public function test_admin_can_create_awards_within_voting_event(): void
    {
        $event = VotingEvent::create([
            'title' => 'Tech Awards 2026',
            'slug' => 'tech-awards-2026',
            'status' => 'published',
            'created_by' => $this->admin->id,
        ]);

        $this->actingAs($this->admin);

        $response = $this->post(route('admin.events.awards.store', $event), [
            'name' => 'Innovator of the Year',
            'description' => 'Awarded for technical breakthroughs.',
            'results_visibility' => 'inherit',
            'status' => 'active',
            'display_order' => 1,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('voting_awards', [
            'voting_event_id' => $event->id,
            'name' => 'Innovator of the Year',
            'status' => 'active',
        ]);
    }

    /**
     * 3. Admin can add nominees to an award.
     */
    public function test_admin_can_add_nominees_to_an_award(): void
    {
        $event = VotingEvent::create([
            'title' => 'Excellence Gala',
            'slug' => 'excellence-gala',
            'status' => 'published',
            'created_by' => $this->admin->id,
        ]);

        $award = VotingAward::create([
            'voting_event_id' => $event->id,
            'name' => 'Best Employee',
            'status' => 'active',
            'display_order' => 1,
        ]);

        $this->actingAs($this->admin);

        $response = $this->post(route('admin.awards.nominees.store', $award), [
            'name' => 'Maria Santos',
            'description' => 'Senior Systems Engineer',
            'department' => 'Information Technology',
            'organization' => 'HQ Division',
            'status' => 'active',
            'display_order' => 1,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('voting_nominees', [
            'voting_award_id' => $award->id,
            'name' => 'Maria Santos',
            'department' => 'Information Technology',
        ]);
    }

    /**
     * 4. Authenticated voter can cast a vote.
     */
    public function test_authenticated_voter_can_cast_a_vote(): void
    {
        $event = VotingEvent::create([
            'title' => 'Annual Awards 2026',
            'slug' => 'annual-awards-2026',
            'status' => 'published',
            'created_by' => $this->admin->id,
        ]);

        $award = VotingAward::create([
            'voting_event_id' => $event->id,
            'name' => 'Best Lead',
            'status' => 'active',
            'display_order' => 1,
        ]);

        $event->eligibilities()->create([
            'user_id' => $this->voter->id,
            'is_eligible' => true,
        ]);

        $nominee = VotingNominee::create([
            'voting_award_id' => $award->id,
            'name' => 'John Doe',
            'status' => 'active',
            'display_order' => 1,
        ]);

        $this->actingAs($this->voter);

        $response = $this->post(route('voting.vote'), [
            'voting_event_id' => $event->id,
            'voting_award_id' => $award->id,
            'voting_nominee_id' => $nominee->id,
        ]);

        $response->assertSessionHas('success');
        $this->assertDatabaseHas('voting_votes', [
            'voter_id' => $this->voter->id,
            'voting_event_id' => $event->id,
            'voting_award_id' => $award->id,
            'voting_nominee_id' => $nominee->id,
        ]);
    }

    /**
     * 5. Voter can vote across different awards within the same event.
     */
    public function test_voter_can_vote_across_different_awards(): void
    {
        $event = VotingEvent::create([
            'title' => 'Department Awards',
            'slug' => 'department-awards',
            'status' => 'published',
            'created_by' => $this->admin->id,
        ]);

        $event->eligibilities()->create([
            'user_id' => $this->voter->id,
            'is_eligible' => true,
        ]);

        $awardA = VotingAward::create([
            'voting_event_id' => $event->id,
            'name' => 'Best Support',
            'status' => 'active',
            'display_order' => 1,
        ]);

        $awardB = VotingAward::create([
            'voting_event_id' => $event->id,
            'name' => 'Best Developer',
            'status' => 'active',
            'display_order' => 2,
        ]);

        $nomineeA = VotingNominee::create([
            'voting_award_id' => $awardA->id,
            'name' => 'Alice Support',
            'status' => 'active',
            'display_order' => 1,
        ]);

        $nomineeB = VotingNominee::create([
            'voting_award_id' => $awardB->id,
            'name' => 'Bob Dev',
            'status' => 'active',
            'display_order' => 1,
        ]);

        $this->actingAs($this->voter);

        $this->post(route('voting.vote'), [
            'voting_event_id' => $event->id,
            'voting_award_id' => $awardA->id,
            'voting_nominee_id' => $nomineeA->id,
        ])->assertSessionHas('success');

        $this->post(route('voting.vote'), [
            'voting_event_id' => $event->id,
            'voting_award_id' => $awardB->id,
            'voting_nominee_id' => $nomineeB->id,
        ])->assertSessionHas('success');

        $this->assertDatabaseCount('voting_votes', 2);
    }

    /**
     * 6. Voter cannot vote twice in the same award when changes are disallowed.
     */
    public function test_voter_cannot_vote_twice_in_same_award_when_changes_disallowed(): void
    {
        $event = VotingEvent::create([
            'title' => 'Strict Voting Event',
            'slug' => 'strict-voting-event',
            'status' => 'published',
            'allow_vote_changes' => false,
            'created_by' => $this->admin->id,
        ]);

        $event->eligibilities()->create([
            'user_id' => $this->voter->id,
            'is_eligible' => true,
        ]);

        $award = VotingAward::create([
            'voting_event_id' => $event->id,
            'name' => 'Single Choice Award',
            'status' => 'active',
            'allow_vote_changes' => false,
            'display_order' => 1,
        ]);

        $nominee1 = VotingNominee::create([
            'voting_award_id' => $award->id,
            'name' => 'Nominee One',
            'status' => 'active',
            'display_order' => 1,
        ]);

        $nominee2 = VotingNominee::create([
            'voting_award_id' => $award->id,
            'name' => 'Nominee Two',
            'status' => 'active',
            'display_order' => 2,
        ]);

        $this->actingAs($this->voter);

        // First vote succeeds with full rankings for all 2 nominees
        $this->post(route('voting.vote'), [
            'voting_event_id' => $event->id,
            'voting_award_id' => $award->id,
            'rankings' => [
                $nominee1->id => 2,
                $nominee2->id => 1,
            ],
        ])->assertSessionHas('success');

        // Second vote on same award fails when changes are disallowed
        $response = $this->post(route('voting.vote'), [
            'voting_event_id' => $event->id,
            'voting_award_id' => $award->id,
            'rankings' => [
                $nominee1->id => 1,
                $nominee2->id => 2,
            ],
        ]);

        $response->assertSessionHas('error');
        $this->assertDatabaseCount('voting_votes', 2);
        $this->assertDatabaseHas('voting_votes', [
            'voting_nominee_id' => $nominee1->id,
            'rank' => 2,
        ]);
    }

    /**
     * 7. Database-level duplicate protection / unique constraint (UNIQUE(voter_id, voting_award_id)).
     */
    public function test_database_level_unique_constraint_prevents_duplicate_votes(): void
    {
        $event = VotingEvent::create([
            'title' => 'DB Constraint Test',
            'slug' => 'db-constraint-test',
            'status' => 'published',
            'created_by' => $this->admin->id,
        ]);

        $award = VotingAward::create([
            'voting_event_id' => $event->id,
            'name' => 'Award DB Test',
            'status' => 'active',
            'display_order' => 1,
        ]);

        $nominee = VotingNominee::create([
            'voting_award_id' => $award->id,
            'name' => 'Nominee A',
            'status' => 'active',
            'display_order' => 1,
        ]);

        VotingVote::create([
            'voter_id' => $this->voter->id,
            'voting_event_id' => $event->id,
            'voting_award_id' => $award->id,
            'voting_nominee_id' => $nominee->id,
            'voted_at' => now(),
        ]);

        // Attempting direct raw insertion violating UNIQUE(voter_id, voting_award_id) must throw QueryException
        $this->expectException(QueryException::class);

        VotingVote::create([
            'voter_id' => $this->voter->id,
            'voting_event_id' => $event->id,
            'voting_award_id' => $award->id,
            'voting_nominee_id' => $nominee->id,
            'voted_at' => now(),
        ]);
    }

    /**
     * 8. Cross-award nominee vote rejection.
     */
    public function test_cross_award_nominee_vote_rejection(): void
    {
        $event = VotingEvent::create([
            'title' => 'Cross Award Event',
            'slug' => 'cross-award-event',
            'status' => 'published',
            'created_by' => $this->admin->id,
        ]);

        $awardA = VotingAward::create([
            'voting_event_id' => $event->id,
            'name' => 'Award A',
            'status' => 'active',
            'display_order' => 1,
        ]);

        $awardB = VotingAward::create([
            'voting_event_id' => $event->id,
            'name' => 'Award B',
            'status' => 'active',
            'display_order' => 2,
        ]);

        // Nominee belongs to Award B
        $nomineeB = VotingNominee::create([
            'voting_award_id' => $awardB->id,
            'name' => 'Nominee in B',
            'status' => 'active',
            'display_order' => 1,
        ]);

        $this->actingAs($this->voter);

        // Submit vote stating voting_award_id is Award A, but nominee is in Award B
        $response = $this->post(route('voting.vote'), [
            'voting_event_id' => $event->id,
            'voting_award_id' => $awardA->id,
            'voting_nominee_id' => $nomineeB->id,
        ]);

        $response->assertSessionHas('error');
        $this->assertDatabaseCount('voting_votes', 0);
    }

    /**
     * 9. Unauthenticated vote rejection.
     */
    public function test_unauthenticated_vote_rejection(): void
    {
        $response = $this->post(route('voting.vote'), [
            'voting_event_id' => 1,
            'voting_award_id' => 1,
            'voting_nominee_id' => 1,
        ]);

        $response->assertRedirect(route('login'));
        $this->assertDatabaseCount('voting_votes', 0);
    }

    /**
     * 10. Non-admin route protection (403 Forbidden).
     */
    public function test_non_admin_route_protection(): void
    {
        $this->actingAs($this->voter);

        $response = $this->get(route('admin.dashboard'));
        $response->assertForbidden();

        $response = $this->get(route('admin.events.index'));
        $response->assertForbidden();
    }

    /**
     * 11. Rejection before opening time (starts_at).
     */
    public function test_rejection_before_opening_time(): void
    {
        $event = VotingEvent::create([
            'title' => 'Future Event',
            'slug' => 'future-event',
            'status' => 'published',
            'starts_at' => now()->addDays(2),
            'ends_at' => now()->addDays(5),
            'created_by' => $this->admin->id,
        ]);

        $award = VotingAward::create([
            'voting_event_id' => $event->id,
            'name' => 'Future Award',
            'status' => 'active',
            'display_order' => 1,
        ]);

        $nominee = VotingNominee::create([
            'voting_award_id' => $award->id,
            'name' => 'Future Nominee',
            'status' => 'active',
            'display_order' => 1,
        ]);

        $this->actingAs($this->voter);

        $response = $this->post(route('voting.vote'), [
            'voting_event_id' => $event->id,
            'voting_award_id' => $award->id,
            'voting_nominee_id' => $nominee->id,
        ]);

        $response->assertSessionHas('error');
        $this->assertDatabaseCount('voting_votes', 0);
    }

    /**
     * 12. Rejection after closing time (ends_at).
     */
    public function test_rejection_after_closing_time(): void
    {
        $event = VotingEvent::create([
            'title' => 'Past Event',
            'slug' => 'past-event',
            'status' => 'published',
            'starts_at' => now()->subDays(5),
            'ends_at' => now()->subMinutes(10),
            'created_by' => $this->admin->id,
        ]);

        $award = VotingAward::create([
            'voting_event_id' => $event->id,
            'name' => 'Past Award',
            'status' => 'active',
            'display_order' => 1,
        ]);

        $nominee = VotingNominee::create([
            'voting_award_id' => $award->id,
            'name' => 'Past Nominee',
            'status' => 'active',
            'display_order' => 1,
        ]);

        $this->actingAs($this->voter);

        $response = $this->post(route('voting.vote'), [
            'voting_event_id' => $event->id,
            'voting_award_id' => $award->id,
            'voting_nominee_id' => $nominee->id,
        ]);

        $response->assertSessionHas('error');
        $this->assertDatabaseCount('voting_votes', 0);
    }

    /**
     * 13. Inactive award or nominee rejection.
     */
    public function test_inactive_award_or_nominee_rejection(): void
    {
        $event = VotingEvent::create([
            'title' => 'Active Event',
            'slug' => 'active-event',
            'status' => 'published',
            'created_by' => $this->admin->id,
        ]);

        $inactiveAward = VotingAward::create([
            'voting_event_id' => $event->id,
            'name' => 'Inactive Award',
            'status' => 'inactive',
            'display_order' => 1,
        ]);

        $nomineeInInactive = VotingNominee::create([
            'voting_award_id' => $inactiveAward->id,
            'name' => 'Nominee X',
            'status' => 'active',
            'display_order' => 1,
        ]);

        $this->actingAs($this->voter);

        // Attempt vote on inactive award
        $this->post(route('voting.vote'), [
            'voting_event_id' => $event->id,
            'voting_award_id' => $inactiveAward->id,
            'voting_nominee_id' => $nomineeInInactive->id,
        ])->assertSessionHas('error');

        // Test inactive nominee in active award
        $activeAward = VotingAward::create([
            'voting_event_id' => $event->id,
            'name' => 'Active Award',
            'status' => 'active',
            'display_order' => 2,
        ]);

        $inactiveNominee = VotingNominee::create([
            'voting_award_id' => $activeAward->id,
            'name' => 'Suspended Nominee',
            'status' => 'inactive',
            'display_order' => 1,
        ]);

        $this->post(route('voting.vote'), [
            'voting_event_id' => $event->id,
            'voting_award_id' => $activeAward->id,
            'voting_nominee_id' => $inactiveNominee->id,
        ])->assertSessionHas('error');

        $this->assertDatabaseCount('voting_votes', 0);
    }

    /**
     * 14. Private results restriction when configured.
     */
    public function test_private_results_restriction_when_configured(): void
    {
        $event = VotingEvent::create([
            'title' => 'Confidential Gala',
            'slug' => 'confidential-gala',
            'status' => 'closed',
            'results_visibility' => 'private',
            'created_by' => $this->admin->id,
        ]);

        $this->actingAs($this->voter);

        // Voter should receive 403 Forbidden
        $response = $this->get(route('voting.results', $event->slug));
        $response->assertForbidden();

        // Admin can access admin results view
        $this->actingAs($this->admin);
        $adminResponse = $this->get(route('admin.results.index', ['event_id' => $event->id]));
        $adminResponse->assertOk();
    }

    /**
     * 15. Vote changing follows administrator configuration (allow_vote_changes).
     */
    public function test_vote_changing_follows_administrator_configuration(): void
    {
        $event = VotingEvent::create([
            'title' => 'Flexible Choice Awards',
            'slug' => 'flexible-choice-awards',
            'status' => 'published',
            'allow_vote_changes' => true,
            'created_by' => $this->admin->id,
        ]);

        $event->eligibilities()->create([
            'user_id' => $this->voter->id,
            'is_eligible' => true,
        ]);

        $award = VotingAward::create([
            'voting_event_id' => $event->id,
            'name' => 'Community Favorite',
            'status' => 'active',
            'allow_vote_changes' => true,
            'display_order' => 1,
        ]);

        $nominee1 = VotingNominee::create([
            'voting_award_id' => $award->id,
            'name' => 'Initial Candidate',
            'status' => 'active',
            'display_order' => 1,
        ]);

        $nominee2 = VotingNominee::create([
            'voting_award_id' => $award->id,
            'name' => 'Updated Candidate',
            'status' => 'active',
            'display_order' => 2,
        ]);

        $this->actingAs($this->voter);

        // Cast initial rankings
        $this->post(route('voting.vote'), [
            'voting_event_id' => $event->id,
            'voting_award_id' => $award->id,
            'rankings' => [
                $nominee1->id => 2,
                $nominee2->id => 1,
            ],
        ])->assertSessionHas('success');

        $this->assertDatabaseHas('voting_votes', [
            'voter_id' => $this->voter->id,
            'voting_nominee_id' => $nominee1->id,
            'rank' => 2,
        ]);

        // Change rankings to nominee 2 as rank 2
        $response = $this->post(route('voting.vote'), [
            'voting_event_id' => $event->id,
            'voting_award_id' => $award->id,
            'rankings' => [
                $nominee1->id => 1,
                $nominee2->id => 2,
            ],
        ]);

        $response->assertSessionHas('success');
        $this->assertDatabaseCount('voting_votes', 2);
        $this->assertDatabaseHas('voting_votes', [
            'voter_id' => $this->voter->id,
            'voting_nominee_id' => $nominee2->id,
            'rank' => 2,
        ]);
    }

    /**
     * 16. Historical results accuracy after closing.
     */
    public function test_historical_results_accuracy_after_closing(): void
    {
        $event = VotingEvent::create([
            'title' => 'Past Championship',
            'slug' => 'past-championship',
            'status' => 'closed',
            'results_visibility' => 'public',
            'created_by' => $this->admin->id,
        ]);

        $award = VotingAward::create([
            'voting_event_id' => $event->id,
            'name' => 'MVP 2025',
            'status' => 'active',
            'display_order' => 1,
        ]);

        $nomineeWinner = VotingNominee::create([
            'voting_award_id' => $award->id,
            'name' => 'Winner Nominee',
            'status' => 'active',
            'display_order' => 1,
        ]);

        $nomineeRunnerUp = VotingNominee::create([
            'voting_award_id' => $award->id,
            'name' => 'Runner-up Nominee',
            'status' => 'active',
            'display_order' => 2,
        ]);

        // Voter 1 votes for Winner
        VotingVote::create([
            'voter_id' => $this->voter->id,
            'voting_event_id' => $event->id,
            'voting_award_id' => $award->id,
            'voting_nominee_id' => $nomineeWinner->id,
            'voted_at' => now()->subDay(),
        ]);

        // Voter 2 votes for Winner
        $voter2 = User::factory()->create(['voting_role' => 'voter']);
        VotingVote::create([
            'voter_id' => $voter2->id,
            'voting_event_id' => $event->id,
            'voting_award_id' => $award->id,
            'voting_nominee_id' => $nomineeWinner->id,
            'voted_at' => now()->subDay(),
        ]);

        // Voter 3 votes for Runner-up
        $voter3 = User::factory()->create(['voting_role' => 'voter']);
        VotingVote::create([
            'voter_id' => $voter3->id,
            'voting_event_id' => $event->id,
            'voting_award_id' => $award->id,
            'voting_nominee_id' => $nomineeRunnerUp->id,
            'voted_at' => now()->subDay(),
        ]);

        $this->actingAs($this->voter);

        $response = $this->get(route('voting.results', $event->slug));
        $response->assertOk();

        // Check props delivered to Inertia
        $response->assertInertia(fn ($page) => $page
            ->component('voting/results')
            ->has('event')
            ->where('event.id', $event->id)
            ->has('awards', 1)
            ->where('awards.0.nominees.0.name', 'Winner Nominee')
            ->where('awards.0.nominees.0.votes_count', 2)
            ->where('awards.0.nominees.0.percentage', 66.7)
            ->where('awards.0.nominees.1.name', 'Runner-up Nominee')
            ->where('awards.0.nominees.1.votes_count', 1)
            ->where('awards.0.nominees.1.percentage', 33.3)
        );
    }

    /**
     * 17. Voter not in event's allowed list is rejected from voting.
     */
    public function test_unauthorized_voter_not_in_allowed_list_is_rejected(): void
    {
        $event = VotingEvent::create([
            'title' => 'Exclusive Gala 2026',
            'slug' => 'exclusive-gala-2026',
            'status' => 'published',
            'created_by' => $this->admin->id,
        ]);

        $award = VotingAward::create([
            'voting_event_id' => $event->id,
            'name' => 'Honor Award',
            'status' => 'active',
            'display_order' => 1,
        ]);

        $nominee = VotingNominee::create([
            'voting_award_id' => $award->id,
            'name' => 'Dr. Jane Smith',
            'status' => 'active',
            'display_order' => 1,
        ]);

        // Voter is not added to event allowed list
        $this->actingAs($this->voter);

        $response = $this->post(route('voting.vote'), [
            'voting_event_id' => $event->id,
            'voting_award_id' => $award->id,
            'voting_nominee_id' => $nominee->id,
        ]);

        $response->assertSessionHas('error', 'You are not on the list of authorized voters for this event.');
        $this->assertDatabaseMissing('voting_votes', [
            'voter_id' => $this->voter->id,
            'voting_event_id' => $event->id,
        ]);
    }

    /**
     * 18. Admin can add voters to event's allowed list.
     */
    public function test_admin_can_add_voters_to_event_allowed_list(): void
    {
        $event = VotingEvent::create([
            'title' => 'Division Awards',
            'slug' => 'division-awards',
            'status' => 'published',
            'created_by' => $this->admin->id,
        ]);

        $newVoter1 = User::factory()->create();
        $newVoter2 = User::factory()->create();

        $this->actingAs($this->admin);

        $response = $this->post(route('admin.events.voters.store', $event), [
            'user_ids' => [$newVoter1->id, $newVoter2->id],
        ]);

        $response->assertSessionHas('success');
        $this->assertDatabaseHas('voting_user_eligibilities', [
            'voting_event_id' => $event->id,
            'user_id' => $newVoter1->id,
            'is_eligible' => true,
        ]);
        $this->assertDatabaseHas('voting_user_eligibilities', [
            'voting_event_id' => $event->id,
            'user_id' => $newVoter2->id,
            'is_eligible' => true,
        ]);
    }

    /**
     * 19. Admin can remove voter from event's allowed list.
     */
    public function test_admin_can_remove_voter_from_event_allowed_list(): void
    {
        $event = VotingEvent::create([
            'title' => 'Council Election',
            'slug' => 'council-election',
            'status' => 'published',
            'created_by' => $this->admin->id,
        ]);

        $event->eligibilities()->create([
            'user_id' => $this->voter->id,
            'is_eligible' => true,
        ]);

        $this->actingAs($this->admin);

        $response = $this->delete(route('admin.events.voters.destroy', [$event, $this->voter]));

        $response->assertSessionHas('success');
        $this->assertDatabaseMissing('voting_user_eligibilities', [
            'voting_event_id' => $event->id,
            'user_id' => $this->voter->id,
        ]);
    }

    /**
     * 20. Admin can enroll all users into event's allowed list.
     */
    public function test_admin_can_allow_all_users_for_event(): void
    {
        $event = VotingEvent::create([
            'title' => 'All-Hands Voting',
            'slug' => 'all-hands-voting',
            'status' => 'published',
            'created_by' => $this->admin->id,
        ]);

        $extraUser = User::factory()->create();

        $this->actingAs($this->admin);

        $response = $this->post(route('admin.events.voters.allow-all', $event));

        $response->assertSessionHas('success');
        $this->assertDatabaseHas('voting_user_eligibilities', [
            'voting_event_id' => $event->id,
            'user_id' => $extraUser->id,
            'is_eligible' => true,
        ]);
    }

    /**
     * 21. Admin can clear all authorized voters for event.
     */
    public function test_admin_can_clear_allowed_voters_for_event(): void
    {
        $event = VotingEvent::create([
            'title' => 'Reset Eligibility Event',
            'slug' => 'reset-eligibility-event',
            'status' => 'published',
            'created_by' => $this->admin->id,
        ]);

        $event->eligibilities()->create([
            'user_id' => $this->voter->id,
            'is_eligible' => true,
        ]);

        $this->actingAs($this->admin);

        $response = $this->post(route('admin.events.voters.clear', $event));

        $response->assertSessionHas('success');
        $this->assertEquals(0, $event->eligibilities()->count());
    }

    /**
     * 22. Admin can upload photo when creating a nominee.
     */
    public function test_admin_can_upload_photo_when_creating_nominee(): void
    {
        Storage::fake('public');

        $event = VotingEvent::create([
            'title' => 'Gala 2026',
            'slug' => 'gala-2026',
            'status' => 'published',
            'created_by' => $this->admin->id,
        ]);

        $award = VotingAward::create([
            'voting_event_id' => $event->id,
            'name' => 'Visual Arts Award',
            'status' => 'active',
            'display_order' => 1,
        ]);

        $this->actingAs($this->admin);

        $file = UploadedFile::fake()->image('maria.jpg', 600, 600);

        $response = $this->post(route('admin.awards.nominees.store', $award), [
            'name' => 'Maria Santos',
            'description' => 'Creative Director',
            'department' => 'Design',
            'status' => 'active',
            'display_order' => 1,
            'photo' => $file,
        ]);

        $response->assertSessionHas('success');

        $nominee = VotingNominee::where('name', 'Maria Santos')->first();
        $this->assertNotNull($nominee);
        $this->assertNotNull($nominee->photo_path);
        $this->assertStringStartsWith('/storage/nominees/', $nominee->photo_path);

        $storedPath = str_replace('/storage/', '', $nominee->photo_path);
        Storage::disk('public')->assertExists($storedPath);
    }

    /**
     * 23. Admin can update nominee photo and remove photo.
     */
    public function test_admin_can_update_nominee_photo_and_remove_photo(): void
    {
        Storage::fake('public');

        $event = VotingEvent::create([
            'title' => 'Gala 2026',
            'slug' => 'gala-2026',
            'status' => 'published',
            'created_by' => $this->admin->id,
        ]);

        $award = VotingAward::create([
            'voting_event_id' => $event->id,
            'name' => 'Visual Arts Award',
            'status' => 'active',
            'display_order' => 1,
        ]);

        $nominee = VotingNominee::create([
            'voting_award_id' => $award->id,
            'name' => 'Alex Turner',
            'status' => 'active',
            'display_order' => 1,
        ]);

        $this->actingAs($this->admin);

        // 1. Upload photo via update
        $file1 = UploadedFile::fake()->image('alex.png', 400, 400);

        $response = $this->post(route('admin.nominees.update', $nominee), [
            '_method' => 'put',
            'name' => 'Alex Turner',
            'status' => 'active',
            'display_order' => 1,
            'photo' => $file1,
        ]);

        $response->assertSessionHas('success');
        $nominee->refresh();
        $this->assertNotNull($nominee->photo_path);
        $path1 = str_replace('/storage/', '', $nominee->photo_path);
        Storage::disk('public')->assertExists($path1);

        // 2. Remove photo
        $response = $this->post(route('admin.nominees.update', $nominee), [
            '_method' => 'put',
            'name' => 'Alex Turner',
            'status' => 'active',
            'display_order' => 1,
            'remove_photo' => '1',
        ]);

        $response->assertSessionHas('success');
        $nominee->refresh();
        $this->assertNull($nominee->photo_path);
        Storage::disk('public')->assertMissing($path1);
    }

    /**
     * 25. Ranking style voting: voter ranks 5 nominees from 5 down to 1.
     */
    public function test_voter_can_rank_five_nominees_from_five_down_to_one(): void
    {
        $event = VotingEvent::create([
            'title' => 'Ranking Championship Event',
            'slug' => 'ranking-championship-event',
            'status' => 'published',
            'allow_vote_changes' => true,
            'created_by' => $this->admin->id,
        ]);

        $event->eligibilities()->create([
            'user_id' => $this->voter->id,
            'is_eligible' => true,
        ]);

        $award = VotingAward::create([
            'voting_event_id' => $event->id,
            'name' => 'Top Innovator Award',
            'status' => 'active',
            'display_order' => 1,
        ]);

        $nominees = [];
        for ($i = 1; $i <= 5; $i++) {
            $nominees[$i] = VotingNominee::create([
                'voting_award_id' => $award->id,
                'name' => "Nominee {$i}",
                'status' => 'active',
                'display_order' => $i,
            ]);
        }

        $this->actingAs($this->voter);

        // Submit ranking: Nominee 1 gets rank 5 (top choice), Nominee 2 gets 4, Nominee 3 gets 3, Nominee 4 gets 2, Nominee 5 gets 1
        $response = $this->post(route('voting.vote'), [
            'voting_event_id' => $event->id,
            'voting_award_id' => $award->id,
            'rankings' => [
                $nominees[1]->id => 5,
                $nominees[2]->id => 4,
                $nominees[3]->id => 3,
                $nominees[4]->id => 2,
                $nominees[5]->id => 1,
            ],
        ]);

        $response->assertSessionHas('success');
        $this->assertDatabaseCount('voting_votes', 5);

        // Verify each nominee's recorded rank in database
        $this->assertDatabaseHas('voting_votes', [
            'voter_id' => $this->voter->id,
            'voting_award_id' => $award->id,
            'voting_nominee_id' => $nominees[1]->id,
            'rank' => 5,
        ]);
        $this->assertDatabaseHas('voting_votes', [
            'voter_id' => $this->voter->id,
            'voting_award_id' => $award->id,
            'voting_nominee_id' => $nominees[5]->id,
            'rank' => 1,
        ]);
    }

    /**
     * 26. Ranking validation rejects duplicate ranks or incomplete rankings.
     */
    public function test_ranking_validation_rejects_duplicate_or_incomplete_ranks(): void
    {
        $event = VotingEvent::create([
            'title' => 'Ranking Strict Event',
            'slug' => 'ranking-strict-event',
            'status' => 'published',
            'created_by' => $this->admin->id,
        ]);

        $event->eligibilities()->create([
            'user_id' => $this->voter->id,
            'is_eligible' => true,
        ]);

        $award = VotingAward::create([
            'voting_event_id' => $event->id,
            'name' => 'Strict Award',
            'status' => 'active',
            'display_order' => 1,
        ]);

        $nom1 = VotingNominee::create(['voting_award_id' => $award->id, 'name' => 'N1', 'status' => 'active']);
        $nom2 = VotingNominee::create(['voting_award_id' => $award->id, 'name' => 'N2', 'status' => 'active']);
        $nom3 = VotingNominee::create(['voting_award_id' => $award->id, 'name' => 'N3', 'status' => 'active']);

        $this->actingAs($this->voter);

        // 1. Incomplete ranking (only 2 out of 3 nominees ranked)
        $response = $this->post(route('voting.vote'), [
            'voting_event_id' => $event->id,
            'voting_award_id' => $award->id,
            'rankings' => [
                $nom1->id => 3,
                $nom2->id => 2,
            ],
        ]);
        $response->assertSessionHas('error');
        $this->assertDatabaseCount('voting_votes', 0);

        // 2. Duplicate ranks assigned (e.g. both given rank 3)
        $response2 = $this->post(route('voting.vote'), [
            'voting_event_id' => $event->id,
            'voting_award_id' => $award->id,
            'rankings' => [
                $nom1->id => 3,
                $nom2->id => 3,
                $nom3->id => 1,
            ],
        ]);
        $response2->assertSessionHas('error');
        $this->assertDatabaseCount('voting_votes', 0);
    }
}
