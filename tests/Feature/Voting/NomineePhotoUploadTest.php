<?php

namespace Tests\Feature\Voting;

use App\Models\User;
use App\Models\VotingAward;
use App\Models\VotingEvent;
use App\Models\VotingNominee;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class NomineePhotoUploadTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private VotingEvent $event;
    private VotingAward $award;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

        $this->admin = User::factory()->create([
            'voting_role' => 'admin',
            'email' => 'admin@example.com',
        ]);

        $this->event = VotingEvent::create([
            'title' => 'Event 1',
            'status' => 'published',
        ]);

        $this->award = VotingAward::create([
            'voting_event_id' => $this->event->id,
            'name' => 'Award 1',
            'status' => 'active',
            'display_order' => 1,
        ]);
    }

    public function test_can_upload_photo_when_adding_nominee(): void
    {
        $this->actingAs($this->admin);

        $file = UploadedFile::fake()->image('candidate.jpg', 400, 400);

        $response = $this->post(route('admin.awards.nominees.store', $this->award), [
            'name' => 'John Candidate',
            'status' => 'active',
            'photo' => $file,
        ]);

        $response->assertSessionHas('success');

        $nominee = VotingNominee::where('name', 'John Candidate')->first();
        $this->assertNotNull($nominee);
        $this->assertNotNull($nominee->photo_path);

        $relative = str_replace('/storage/', '', $nominee->photo_path);
        Storage::disk('public')->assertExists($relative);
    }

    public function test_can_add_nominee_without_photo(): void
    {
        $this->actingAs($this->admin);

        $response = $this->post(route('admin.awards.nominees.store', $this->award), [
            'name' => 'No Photo Candidate',
            'status' => 'active',
            'photo' => null,
        ]);

        $response->assertSessionHas('success');

        $response2 = $this->post(route('admin.awards.nominees.store', $this->award), [
            'name' => 'Empty String Photo Candidate',
            'status' => 'active',
            'photo' => '',
        ]);

        $response2->assertSessionHas('success');
    }

    public function test_can_upload_photo_when_updating_nominee(): void
    {
        $this->actingAs($this->admin);

        $nominee = VotingNominee::create([
            'voting_award_id' => $this->award->id,
            'name' => 'Original Name',
            'status' => 'active',
            'display_order' => 1,
        ]);

        $newFile = UploadedFile::fake()->image('new_photo.png', 400, 400);

        $response = $this->post(route('admin.nominees.update', $nominee), [
            '_method' => 'put',
            'name' => 'Updated Name',
            'status' => 'active',
            'display_order' => 1,
            'photo' => $newFile,
        ]);

        $response->assertSessionHas('success');

        $nominee->refresh();
        $this->assertNotNull($nominee->photo_path);

        $relative = str_replace('/storage/', '', $nominee->photo_path);
        Storage::disk('public')->assertExists($relative);
    }

    public function test_can_remove_photo_when_updating_nominee(): void
    {
        $this->actingAs($this->admin);

        $initialFile = UploadedFile::fake()->image('initial.jpg');
        $storedPath = $initialFile->store('nominees', 'public');

        $nominee = VotingNominee::create([
            'voting_award_id' => $this->award->id,
            'name' => 'Candidate With Photo',
            'status' => 'active',
            'display_order' => 1,
            'photo_path' => '/storage/' . $storedPath,
        ]);

        Storage::disk('public')->assertExists($storedPath);

        $response = $this->post(route('admin.nominees.update', $nominee), [
            '_method' => 'put',
            'name' => 'Candidate With Photo',
            'status' => 'active',
            'display_order' => 1,
            'remove_photo' => '1',
        ]);

        $response->assertSessionHas('success');

        $nominee->refresh();
        $this->assertNull($nominee->photo_path);
        Storage::disk('public')->assertMissing($storedPath);
    }
}
