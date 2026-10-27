<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\RedirectResponse as SymfonyRedirectResponse;

class GoogleAuthController extends Controller
{
    /**
     * Redirect the user to the Google authentication page.
     */
    public function redirectToGoogle(): SymfonyRedirectResponse
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
        $avatar = $googleUser->getAvatar();

        if (empty($email)) {
            return redirect()
                ->route('login')
                ->withErrors(['email' => 'Google account did not return a valid email address.']);
        }

        // Must be a registered email existing in the database
        $user = User::where('email', $email)->first();

        if (! $user) {
            $user = User::whereRaw('LOWER(email) = ?', [strtolower($email)])->first();
        }

        if (! $user) {
            return redirect()
                ->route('login')
                ->withErrors(['email' => 'This email is not registered in our database. Please contact an administrator.']);
        }

        // Account must be active (is_status = 1)
        if ((int) $user->is_status !== 1) {
            return redirect()
                ->route('login')
                ->withErrors(['email' => 'Your account is inactive. Please contact an administrator.']);
        }

        $dirty = false;
        if ($user->google_id !== $googleId) {
            $user->google_id = $googleId;
            $dirty = true;
        }
        if ($avatar && empty($user->avatar)) {
            $user->avatar = $avatar;
            $dirty = true;
        }
        if ($dirty) {
            $user->save();
        }

        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
        }

        Auth::login($user, remember: true);
        $request->session()->regenerate();

        if ($user->isAdmin()) {
            return redirect()->intended(route('admin.dashboard'));
        }

        return redirect()->intended(route('dashboard'));
    }
}
