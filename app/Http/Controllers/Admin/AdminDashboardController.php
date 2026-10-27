<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\VotingAuditLog;
use App\Models\VotingAward;
use App\Models\VotingEvent;
use App\Models\VotingNominee;
use App\Models\VotingVote;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminDashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $totalEvents = VotingEvent::count();
        $activeEvents = VotingEvent::where('status', 'published')
            ->where(function ($q) {
                $q->whereNull('starts_at')->orWhere('starts_at', '<=', now());
            })
            ->where(function ($q) {
                $q->whereNull('ends_at')->orWhere('ends_at', '>=', now());
            })
            ->count();

        $totalAwards = VotingAward::count();
        $totalNominees = VotingNominee::count();
        $totalVotes = VotingVote::count();
        $totalVoters = User::count();

        $distinctVotersCount = VotingVote::distinct('voter_id')->count('voter_id');
        $turnoutPercentage = $totalVoters > 0 ? round(($distinctVotersCount / $totalVoters) * 100, 1) : 0;

        $recentEvents = VotingEvent::withCount(['awards', 'votes'])
            ->orderByDesc('created_at')
            ->take(5)
            ->get()
            ->map(fn ($event) => [
                'id' => $event->id,
                'title' => $event->title,
                'slug' => $event->slug,
                'status' => $event->computed_status,
                'starts_at' => $event->starts_at?->format('M d, Y H:i'),
                'ends_at' => $event->ends_at?->format('M d, Y H:i'),
                'awards_count' => $event->awards_count,
                'votes_count' => $event->votes_count,
            ]);

        $recentLogs = VotingAuditLog::with('user')
            ->orderByDesc('created_at')
            ->take(8)
            ->get()
            ->map(fn (VotingAuditLog $log) => [
                'id' => $log->id,
                'action' => $log->action,
                'description' => $log->description,
                'user_name' => $log->user ? $log->user->display_name : 'System',
                'created_at' => $log->created_at->diffForHumans(),
            ]);

        return Inertia::render('admin/dashboard', [
            'metrics' => [
                'total_events' => $totalEvents,
                'active_events' => $activeEvents,
                'total_awards' => $totalAwards,
                'total_nominees' => $totalNominees,
                'total_votes' => $totalVotes,
                'total_voters' => $totalVoters,
                'distinct_voters' => $distinctVotersCount,
                'turnout_percentage' => $turnoutPercentage,
            ],
            'recent_events' => $recentEvents,
            'recent_logs' => $recentLogs,
        ]);
    }
}
