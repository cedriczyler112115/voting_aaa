<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\VotingAuditLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class VotingAuditLogController extends Controller
{
    public function index(Request $request): Response
    {
        $action = $request->input('action');
        $search = $request->input('search');

        $logs = VotingAuditLog::query()
            ->with('user')
            ->when($action, function ($query, $action) {
                $query->where('action', 'like', "%{$action}%");
            })
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('description', 'like', "%{$search}%")
                        ->orWhere('ip_address', 'like', "%{$search}%")
                        ->orWhereHas('user', function ($uq) use ($search) {
                            $uq->where('name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%");
                        });
                });
            })
            ->orderByDesc('created_at')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (VotingAuditLog $log) => [
                'id' => $log->id,
                'action' => $log->action,
                'description' => $log->description,
                'user_name' => $log->user ? $log->user->display_name : 'System',
                'user_email' => $log->user ? $log->user->email : null,
                'ip_address' => $log->ip_address,
                'old_values' => $log->old_values,
                'new_values' => $log->new_values,
                'created_at' => $log->created_at->format('M d, Y H:i:s'),
                'time_ago' => $log->created_at->diffForHumans(),
            ]);

        $actions = VotingAuditLog::select('action')
            ->distinct()
            ->orderBy('action')
            ->pluck('action');

        return Inertia::render('admin/audit-logs/index', [
            'logs' => $logs,
            'actions' => $actions,
            'filters' => [
                'action' => $action,
                'search' => $search,
            ],
        ]);
    }
}
