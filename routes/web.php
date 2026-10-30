<?php

use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\VoterManagementController;
use App\Http\Controllers\Admin\VotingAuditLogController;
use App\Http\Controllers\Admin\VotingAwardController;
use App\Http\Controllers\Admin\VotingCriterionController;
use App\Http\Controllers\Admin\VotingEventController;
use App\Http\Controllers\Admin\VotingNomineeController;
use App\Http\Controllers\Admin\VotingResultController;
use App\Http\Controllers\Auth\GoogleAuthController;
use App\Http\Controllers\VotingController;
use Illuminate\Support\Facades\Route;

// Public / Landing Page
Route::get('/', function () {
    if (auth()->check()) {
        return redirect()->route('dashboard');
    }

    return redirect()->route('login');
})->name('home');

// Google OAuth Authentication
Route::middleware('guest')->group(function () {
    Route::get('/auth/google', [GoogleAuthController::class, 'redirectToGoogle'])->name('auth.google');
    Route::get('/auth/google/callback', [GoogleAuthController::class, 'handleGoogleCallback'])->name('auth.google.callback');
});

// Authenticated Voter Routes
Route::middleware(['auth'])->group(function () {
    // Voter Dashboard (Events List)
    Route::get('/dashboard', [VotingController::class, 'index'])->name('dashboard');

    // Voting Event Details & Voting Flow
    Route::get('/voting/{slug}', [VotingController::class, 'show'])->name('voting.show');
    Route::post('/voting/save-nominee-score', [VotingController::class, 'saveNomineeScore'])->name('voting.nominee-score');
    Route::post('/voting/vote', [VotingController::class, 'castVote'])->name('voting.vote');
    Route::get('/voting/{slug}/results', [VotingController::class, 'results'])->name('voting.results');
    Route::get('/tabulation-results', [VotingController::class, 'tabulationResults'])->name('voting.tabulation');
    Route::get('/tabulation-results/breakdown/{award}', [VotingController::class, 'tabulationBreakdown'])->name('voting.tabulation-breakdown');
    Route::get('/voting-history', [VotingController::class, 'history'])->name('voting.history');
});

// Administrator Routes (Protected with auth + admin role)
Route::middleware(['auth', 'admin'])->prefix('admin')->name('admin.')->group(function () {
    // Admin Dashboard
    Route::get('/', [AdminDashboardController::class, 'index'])->name('dashboard');

    // Voting Event Management
    Route::get('/events', [VotingEventController::class, 'index'])->name('events.index');
    Route::post('/events', [VotingEventController::class, 'store'])->name('events.store');
    Route::get('/events/{event}', [VotingEventController::class, 'show'])->name('events.show');
    Route::put('/events/{event}', [VotingEventController::class, 'update'])->name('events.update');
    Route::delete('/events/{event}', [VotingEventController::class, 'destroy'])->name('events.destroy');
    Route::post('/events/{event}/status', [VotingEventController::class, 'updateStatus'])->name('events.status');
    Route::post('/events/{event}/voters', [VotingEventController::class, 'addVoters'])->name('events.voters.store');
    Route::delete('/events/{event}/voters/{user}', [VotingEventController::class, 'removeVoter'])->name('events.voters.destroy');
    Route::post('/events/{event}/voters/allow-all', [VotingEventController::class, 'allowAllVoters'])->name('events.voters.allow-all');
    Route::post('/events/{event}/voters/clear', [VotingEventController::class, 'clearAllowedVoters'])->name('events.voters.clear');

    // Award Category Criteria Management (Dynamic CRUD criteria per award category totaling 100%)
    Route::post('/awards/{award}/criteria', [VotingCriterionController::class, 'store'])->name('awards.criteria.store');
    Route::post('/awards/{award}/criteria/copy-to-all', [VotingCriterionController::class, 'copyToAll'])->name('awards.criteria.copy-to-all');
    Route::put('/criteria/{criterion}', [VotingCriterionController::class, 'update'])->name('criteria.update');
    Route::delete('/criteria/{criterion}', [VotingCriterionController::class, 'destroy'])->name('criteria.destroy');

    // Award Management
    Route::post('/events/{event}/awards', [VotingAwardController::class, 'store'])->name('events.awards.store');
    Route::put('/awards/{award}', [VotingAwardController::class, 'update'])->name('awards.update');
    Route::delete('/awards/{award}', [VotingAwardController::class, 'destroy'])->name('awards.destroy');

    // Nominee Management
    Route::post('/awards/{award}/nominees', [VotingNomineeController::class, 'store'])->name('awards.nominees.store');
    Route::match(['put', 'post'], '/nominees/{nominee}', [VotingNomineeController::class, 'update'])->name('nominees.update');
    Route::delete('/nominees/{nominee}', [VotingNomineeController::class, 'destroy'])->name('nominees.destroy');

    // Voter Management & Eligibility
    Route::get('/voters', [VoterManagementController::class, 'index'])->name('voters.index');
    Route::post('/voters/{user}/toggle-role', [VoterManagementController::class, 'toggleRole'])->name('voters.toggle-role');
    Route::post('/voters/{user}/toggle-eligibility', [VoterManagementController::class, 'toggleEligibility'])->name('voters.toggle-eligibility');

    // Results & Reports
    Route::get('/results', [VotingResultController::class, 'index'])->name('results.index');
    Route::get('/results/export', [VotingResultController::class, 'exportCsv'])->name('results.export');

    // Audit Logs
    Route::get('/audit-logs', [VotingAuditLogController::class, 'index'])->name('audit-logs.index');
});

require __DIR__.'/settings.php';
