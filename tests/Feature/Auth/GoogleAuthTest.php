<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Contracts\Provider;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use Mockery;
use Tests\TestCase;

class GoogleAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_redirects_to_google(): void
    {
        $response = $this->get(route('auth.google'));

        $response->assertRedirect();
        $this->assertStringContainsString('accounts.google.com', (string) $response->headers->get('Location'));
    }

    public function test_callback_handles_error_param(): void
    {
        $response = $this->get(route('auth.google.callback', ['error' => 'access_denied']));

        $response->assertRedirect(route('login'));
        $response->assertSessionHasErrors(['email' => 'Google sign-in was cancelled or denied.']);
        $this->assertGuest();
    }

    public function test_callback_handles_socialite_exception(): void
    {
        $provider = Mockery::mock(Provider::class);
        $provider->shouldReceive('user')->andThrow(new \Exception('OAuth error'));
        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);

        $response = $this->get(route('auth.google.callback'));

        $response->assertRedirect(route('login'));
        $response->assertSessionHasErrors(['email' => 'Unable to authenticate with Google. Please try again.']);
        $this->assertGuest();
    }

    public function test_fails_when_google_returns_empty_email(): void
    {
        $socialiteUser = Mockery::mock(SocialiteUser::class);
        $socialiteUser->shouldReceive('getEmail')->andReturn('');
        $socialiteUser->shouldReceive('getId')->andReturn('google-123');
        $socialiteUser->shouldReceive('getAvatar')->andReturn(null);

        $provider = Mockery::mock(Provider::class);
        $provider->shouldReceive('user')->andReturn($socialiteUser);
        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);

        $response = $this->get(route('auth.google.callback'));

        $response->assertRedirect(route('login'));
        $response->assertSessionHasErrors(['email' => 'Google account did not return a valid email address.']);
        $this->assertGuest();
    }

    public function test_fails_when_email_not_registered_in_database(): void
    {
        $socialiteUser = Mockery::mock(SocialiteUser::class);
        $socialiteUser->shouldReceive('getEmail')->andReturn('unregistered@example.com');
        $socialiteUser->shouldReceive('getId')->andReturn('google-123456');
        $socialiteUser->shouldReceive('getAvatar')->andReturn(null);

        $provider = Mockery::mock(Provider::class);
        $provider->shouldReceive('user')->andReturn($socialiteUser);
        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);

        $response = $this->get(route('auth.google.callback'));

        $response->assertRedirect(route('login'));
        $response->assertSessionHasErrors('email');
        $this->assertGuest();

        // Verify no user was created
        $this->assertDatabaseMissing('users', [
            'email' => 'unregistered@example.com',
        ]);
    }

    public function test_fails_when_user_exists_but_is_status_is_not_1(): void
    {
        $user = User::factory()->create([
            'email' => 'inactive@example.com',
            'is_status' => 0,
        ]);

        $socialiteUser = Mockery::mock(SocialiteUser::class);
        $socialiteUser->shouldReceive('getEmail')->andReturn('inactive@example.com');
        $socialiteUser->shouldReceive('getId')->andReturn('google-inactive-id');
        $socialiteUser->shouldReceive('getAvatar')->andReturn(null);

        $provider = Mockery::mock(Provider::class);
        $provider->shouldReceive('user')->andReturn($socialiteUser);
        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);

        $response = $this->get(route('auth.google.callback'));

        $response->assertRedirect(route('login'));
        $response->assertSessionHasErrors(['email' => 'Your account is inactive. Please contact an administrator.']);
        $this->assertGuest();
    }

    public function test_authenticates_active_registered_user(): void
    {
        $user = User::factory()->create([
            'email' => 'voter@example.com',
            'is_status' => 1,
            'voting_role' => 'voter',
            'google_id' => null,
        ]);

        $socialiteUser = Mockery::mock(SocialiteUser::class);
        $socialiteUser->shouldReceive('getEmail')->andReturn('voter@example.com');
        $socialiteUser->shouldReceive('getId')->andReturn('google-active-id');
        $socialiteUser->shouldReceive('getAvatar')->andReturn('https://example.com/avatar.jpg');

        $provider = Mockery::mock(Provider::class);
        $provider->shouldReceive('user')->andReturn($socialiteUser);
        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);

        $response = $this->get(route('auth.google.callback'));

        $response->assertRedirect(route('dashboard'));
        $this->assertAuthenticatedAs($user);

        $user->refresh();
        $this->assertSame('google-active-id', $user->google_id);
        $this->assertSame('https://example.com/avatar.jpg', $user->avatar);
    }

    public function test_redirects_admin_to_admin_dashboard(): void
    {
        $admin = User::factory()->create([
            'email' => 'admin@example.com',
            'is_status' => 1,
            'voting_role' => 'admin',
        ]);

        $socialiteUser = Mockery::mock(SocialiteUser::class);
        $socialiteUser->shouldReceive('getEmail')->andReturn('admin@example.com');
        $socialiteUser->shouldReceive('getId')->andReturn('google-admin-id');
        $socialiteUser->shouldReceive('getAvatar')->andReturn(null);

        $provider = Mockery::mock(Provider::class);
        $provider->shouldReceive('user')->andReturn($socialiteUser);
        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);

        $response = $this->get(route('auth.google.callback'));

        $response->assertRedirect(route('admin.dashboard'));
        $this->assertAuthenticatedAs($admin);
    }
}
