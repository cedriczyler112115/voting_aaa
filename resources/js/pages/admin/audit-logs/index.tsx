import { Head, Link, router } from '@inertiajs/react';
import { Eye, Filter, Search, X } from 'lucide-react';
import { FormEvent, useState } from 'react';
import AppLayout from '@/layouts/app-layout';

type LogItem = {
    id: number;
    action: string;
    description: string;
    user_name: string;
    user_email: string | null;
    ip_address: string | null;
    old_values: Record<string, unknown> | null;
    new_values: Record<string, unknown> | null;
    created_at: string;
    time_ago: string;
};

type PaginatedLogs = {
    data: LogItem[];
    current_page: number;
    last_page: number;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
};

type Props = {
    logs: PaginatedLogs;
    actions: string[];
    filters: {
        action?: string;
        search?: string;
    };
};

export default function AuditLogsIndex({ logs, actions, filters }: Props) {
    const [actionFilter, setActionFilter] = useState(filters.action || '');
    const [search, setSearch] = useState(filters.search || '');
    const [selectedLog, setSelectedLog] = useState<LogItem | null>(null);

    const handleSearch = (e: FormEvent) => {
        e.preventDefault();
        router.get(
            '/admin/audit-logs',
            { action: actionFilter, search },
            { preserveState: true },
        );
    };

    const breadcrumbs = [
        { title: 'Administration', href: '/admin' },
        { title: 'Audit Logs', href: '/admin/audit-logs' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="System Audit Logs & Activity Trail" />

            <div className="voting-container flex w-full flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                        System Audit Logs & Security Trail
                    </h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Track administrative actions, voting events, status
                        transitions, and ballot modifications.
                    </p>
                </div>

                {/* Filters */}
                <form
                    onSubmit={handleSearch}
                    className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center"
                >
                    <div className="relative flex-1">
                        <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search description, user name, email, or IP address..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-lg border border-border bg-background py-2 pr-4 pl-9 text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <select
                            value={actionFilter}
                            onChange={(e) => setActionFilter(e.target.value)}
                            className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                        >
                            <option value="">All Actions</option>
                            {actions.map((act) => (
                                <option key={act} value={act}>
                                    {act}
                                </option>
                            ))}
                        </select>

                        <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted/80"
                        >
                            <Filter className="h-3.5 w-3.5" />
                            Filter
                        </button>
                    </div>
                </form>

                {/* Logs Table */}
                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-border bg-muted/40 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                <tr>
                                    <th className="px-6 py-4">Action</th>
                                    <th className="px-6 py-4">Description</th>
                                    <th className="px-6 py-4">Actor</th>
                                    <th className="px-6 py-4">Timestamp</th>
                                    <th className="px-6 py-4 text-right">
                                        Details
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {logs.data.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="p-8 text-center text-sm text-muted-foreground"
                                        >
                                            No audit log records match the
                                            search filter.
                                        </td>
                                    </tr>
                                ) : (
                                    logs.data.map((log) => (
                                        <tr
                                            key={log.id}
                                            className="transition-colors hover:bg-muted/20"
                                        >
                                            <td className="px-6 py-4 font-mono text-xs font-bold text-primary">
                                                {log.action}
                                            </td>

                                            <td className="max-w-md px-6 py-4 text-xs text-foreground">
                                                <div className="line-clamp-2 leading-relaxed">
                                                    {log.description}
                                                </div>
                                                {log.ip_address && (
                                                    <span className="font-mono text-[10px] text-muted-foreground">
                                                        IP: {log.ip_address}
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-6 py-4 text-xs">
                                                <div className="font-semibold text-foreground">
                                                    {log.user_name}
                                                </div>
                                                {log.user_email && (
                                                    <div className="text-[11px] text-muted-foreground">
                                                        {log.user_email}
                                                    </div>
                                                )}
                                            </td>

                                            <td className="px-6 py-4 text-xs whitespace-nowrap text-muted-foreground">
                                                <div>{log.created_at}</div>
                                                <div className="text-[11px] text-muted-foreground/80">
                                                    {log.time_ago}
                                                </div>
                                            </td>

                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                {log.old_values ||
                                                log.new_values ? (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setSelectedLog(log)
                                                        }
                                                        className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted"
                                                    >
                                                        <Eye className="h-3 w-3" />
                                                        Payload
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground/60">
                                                        —
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {logs.last_page > 1 && (
                        <div className="flex items-center justify-between border-t border-border px-6 py-4 text-xs text-muted-foreground">
                            <div>
                                Showing page {logs.current_page} of{' '}
                                {logs.last_page} ({logs.total} total logs)
                            </div>
                            <div className="flex gap-2">
                                {logs.prev_page_url && (
                                    <Link
                                        href={logs.prev_page_url}
                                        className="rounded-md border border-border px-3 py-1.5 font-medium hover:bg-muted"
                                    >
                                        Previous
                                    </Link>
                                )}
                                {logs.next_page_url && (
                                    <Link
                                        href={logs.next_page_url}
                                        className="rounded-md border border-border px-3 py-1.5 font-medium hover:bg-muted"
                                    >
                                        Next
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Payload Detail Modal */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200 fade-in">
                    <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-border/70 pb-4">
                            <div>
                                <h2 className="font-mono text-lg font-bold text-foreground">
                                    {selectedLog.action}
                                </h2>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    Logged on {selectedLog.created_at} by{' '}
                                    {selectedLog.user_name}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedLog(null)}
                                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="mt-4 space-y-4">
                            <div>
                                <div className="mb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                    Description
                                </div>
                                <div className="rounded-lg bg-muted/40 p-3 text-xs text-foreground">
                                    {selectedLog.description}
                                </div>
                            </div>

                            {selectedLog.old_values && (
                                <div>
                                    <div className="mb-1 text-xs font-semibold tracking-wider text-amber-600 uppercase dark:text-amber-400">
                                        Previous State (Old Values)
                                    </div>
                                    <pre className="max-h-48 overflow-x-auto rounded-lg bg-muted/60 p-3 font-mono text-xs text-foreground">
                                        {JSON.stringify(
                                            selectedLog.old_values,
                                            null,
                                            2,
                                        )}
                                    </pre>
                                </div>
                            )}

                            {selectedLog.new_values && (
                                <div>
                                    <div className="mb-1 text-xs font-semibold tracking-wider text-emerald-600 uppercase dark:text-emerald-400">
                                        New State (Updated Values)
                                    </div>
                                    <pre className="max-h-48 overflow-x-auto rounded-lg bg-muted/60 p-3 font-mono text-xs text-foreground">
                                        {JSON.stringify(
                                            selectedLog.new_values,
                                            null,
                                            2,
                                        )}
                                    </pre>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 flex justify-end border-t border-border/70 pt-4">
                            <button
                                type="button"
                                onClick={() => setSelectedLog(null)}
                                className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
