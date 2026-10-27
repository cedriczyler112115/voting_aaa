<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class GoogleAuthController extends Controller
{
    /**
     * Redirect the user to the Google authentication page.
     */
    public function redirectToGoogle(): RedirectResponse
    {
        return Socialite::driver('google')->redirect();
    }

    /**
     * Obtain the user information from Google and authenticate.
     */
    public function handleGoogleCallback(Request $request): RedirectResponse
    {
        if ($request->has('error')) {
            return redirect()
                ->route('login')
                ->withErrors(['email' => 'Google sign-in was cancelled or denied.']);
        }

        try {
            $googleUser = Socialite::driver('google')->user();
        } catch (\Throwable $e) {
            Log::error('Google OAuth callback error', [
                'message' => $e->getMessage(),
            ]);

            return redirect()
                ->route('login')
                ->withErrors(['email' => 'Unable to authenticate with Google. Please try again.']);
        }

        $email = $googleUser->getEmail();
        $googleId = (string) $googleUser->getId();
        $name = $googleUser->getName() ?: ($googleUser->getNickname() ?: 'Google User');
        $avatar = $googleUser->getAvatar();

        if (empty($email)) {
            return redirect()
                ->route('login')
                ->withErrors(['email' => 'Google account did not return a valid email address.']);
        }

        // Look for existing user by google_id or email
        $user = User::where('google_id', $googleId)->first();

        if (! $user) {
            $user = User::where('email', $email)->first();
        }

        if ($user) {
            $dirty = false;
            if ($user->google_id !== $googleId) {
                $user->google_id = $googleId;
                $dirty = true;
            }
            if ($avatar && empty($user->avatar)) {
                $user->avatar = $avatar;
                $dirty = true;
            }
            if (empty($user->email_verified_at)) {
                $user->email_verified_at = now();
                $dirty = true;
            }
            if ($dirty) {
                $user->save();
            }
        } else {
            $user = User::create([
                'name' => $name,
                'email' => $email,
                'google_id' => $googleId,
                'avatar' => $avatar,
                'voting_role' => 'voter',
                'password' => Hash::make(Str::random(32)),
                'email_verified_at' => now(),
            ]);
        }

        Auth::login($user, remember: true);
        $request->session()->regenerate();

        if ($user->isAdmin()) {
            return redirect()->intended(route('admin.dashboard'));
        }

        return redirect()->intended(route('dashboard'));
    }
}
