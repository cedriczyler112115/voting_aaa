<?php

namespace Tests\Feature\Voting;

use App\Models\User;
use App\Models\VotingAward;
use App\Models\VotingCriterion;
use App\Models\VotingEvent;
use App\Models\VotingNominee;
use App\Models\VotingVote;
use App\Models\VotingVoteScore;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TabulationBreakdownTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $divisionChief;
    private User $regularVoter;
    private VotingEvent $event;
    private VotingAward $award;
    private VotingNominee $nominee;

    protected function setUp(): void
    {
        parent::setUp();

        // Admin user (id != 2)
        $this->admin = User::factory()->create([
            'id' => 10,
            'voting_role' => 'admin',
            'email' => 'admin@example.com',
        ]);

        // Division Chief user (id = 2)
        $this->divisionChief = User::factory()->create([
            'id' => 2,
            'voting_role' => 'voter',
            'name' => 'Division Chief User',
            'email' => 'dc@example.com',
        ]);

        // Regular voter (id = 3)
        $this->regularVoter = User::factory()->create([
            'id' => 3,
            'voting_role' => 'voter',
            'name' => 'Section Head Voter',
            'email' => 'sh@example.com',
        ]);

        $this->event = VotingEvent::create([
            'title' => 'Breakdown Test Event',
            'status' => 'published',
            'starts_at' => now()->subDays(2),
            'ends_at' => now()->addDays(2),
            'reveal_date' => now()->addDays(5)->toDateString(), // future reveal date
            'results_visibility' => 'public',
        ]);

        $this->award = VotingAward::create([
            'voting_event_id' => $this->event->id,
            'name' => 'Top Innovator',
            'status' => 'active',
            'display_order' => 1,
        ]);

        $criterion = VotingCriterion::create([
            'voting_award_id' => $this->award->id,
            'name' => 'Innovation',
            'max_score' => 100,
            'display_order' => 1,
        ]);

        $this->nominee = VotingNominee::create([
            'voting_award_id' => $this->award->id,
            'name' => 'Alice Wonder',
            'status' => 'active',
        ]);

        // Cast vote from Division Chief (id = 2)
        $dcVote = VotingVote::create([
            'voting_event_id' => $this->event->id,
            'voting_award_id' => $this->award->id,
            'voting_nominee_id' => $this->nominee->id,
            'voter_id' => $this->divisionChief->id,
            'score' => 90,
            'voted_at' => now(),
        ]);
        VotingVoteScore::create([
            'voting_vote_id' => $dcVote->id,
            'voting_criterion_id' => $criterion->id,
            'score' => 90,
        ]);

        // Cast vote from Section Head (id = 3)
        $shVote = VotingVote::create([
            'voting_event_id' => $this->event->id,
            'voting_award_id' => $this->award->id,
            'voting_nominee_id' => $this->nominee->id,
            'voter_id' => $this->regularVoter->id,
            'score' => 80,
            'voted_at' => now(),
        ]);
        VotingVoteScore::create([
            'voting_vote_id' => $shVote->id,
            'voting_criterion_id' => $criterion->id,
            'score' => 80,
        ]);
    }

    public function test_admin_can_view_breakdown_scores_even_if_reveal_date_is_future(): void
    {
        $response = $this->actingAs($this->admin)->get("/tabulation-results/breakdown/{$this->award->id}");

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('voting/tabulation-breakdown')
            ->where('can_reveal', true)
            ->where('can_view_scores', true)
            ->where('is_reveal_date_reached', false)
            ->has('section_heads', 1)
            ->has('division_chief.scores.' . $this->nominee->id)
        );
    }

    public function test_user_id_2_can_view_breakdown_scores_even_if_reveal_date_is_future(): void
    {
        $response = $this->actingAs($this->divisionChief)->get("/tabulation-results/breakdown/{$this->award->id}");

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('voting/tabulation-breakdown')
            ->where('can_reveal', true)
            ->where('can_view_scores', true)
            ->where('is_reveal_date_reached', false)
            ->has('section_heads', 1)
            ->has('division_chief.scores.' . $this->nominee->id)
        );
    }

    public function test_regular_voter_cannot_view_scores_when_reveal_date_is_future(): void
    {
        $response = $this->actingAs($this->regularVoter)->get("/tabulation-results/breakdown/{$this->award->id}");

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('voting/tabulation-breakdown')
            ->where('can_reveal', false)
            ->where('can_view_scores', false)
            ->where('is_reveal_date_reached', false)
            ->has('section_heads', 0)
            ->where('division_chief.scores', [])
        );
    }

    public function test_regular_voter_can_view_scores_when_reveal_date_is_today_or_past(): void
    {
        // Set reveal date to today
        $this->event->update(['reveal_date' => now()->toDateString()]);

        $response = $this->actingAs($this->regularVoter)->get("/tabulation-results/breakdown/{$this->award->id}");

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('voting/tabulation-breakdown')
            ->where('can_view_scores', true)
            ->where('is_reveal_date_reached', true)
            ->has('section_heads', 1)
            ->has('division_chief.scores.' . $this->nominee->id)
        );
    }

    public function test_regular_voter_cannot_view_scores_when_reveal_date_is_null(): void
    {
        $this->event->update(['reveal_date' => null]);

        $response = $this->actingAs($this->regularVoter)->get("/tabulation-results/breakdown/{$this->award->id}");

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('voting/tabulation-breakdown')
            ->where('can_reveal', false)
            ->where('can_view_scores', false)
            ->where('is_reveal_date_reached', false)
            ->has('section_heads', 0)
            ->where('division_chief.scores', [])
        );
    }
}

