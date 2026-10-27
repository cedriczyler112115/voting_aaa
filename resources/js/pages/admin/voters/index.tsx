import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    CheckCircle2,
    Filter,
    Search,
    Shield,
    ShieldAlert,
    ShieldCheck,
    UserCheck,
    UserX,
    Vote,
} from 'lucide-react';
import { FormEvent, useState } from 'react';
import AppLayout from '@/layouts/app-layout';

type UserItem = {
    id: number;
    name: string;
    email: string;
    role: string;
    is_admin: boolean;
    votes_count: number;
    is_eligible: boolean;
};

type PaginatedUsers = {
    data: UserItem[];
    current_page: number;
    last_page: number;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
};

type EventOption = {
    id: number;
    title: string;
};

type Props = {
    users: PaginatedUsers;
    events: EventOption[];
    filters: {
        search?: string;
        role?: string;
        event_id?: string;
    };
};

export default function VotersIndex({ users, events, filters }: Props) {
    const { auth, flash } = usePage<{
        auth: { user: { id: number } };
        flash?: { success?: string; error?: string };
    }>().props;

    const [search, setSearch] = useState(filters.search || '');
    const [roleFilter, setRoleFilter] = useState(filters.role || '');
    const [eventFilter, setEventFilter] = useState(filters.event_id || '');

    const handleSearch = (e: FormEvent) => {
        e.preventDefault();
        router.get(
            '/admin/voters',
            { search, role: roleFilter, event_id: eventFilter },
            { preserveState: true },
        );
    };

    const handleToggleRole = (user: UserItem) => {
        if (auth.user.id === user.id) {
            alert('You cannot change your own administrative role.');
            return;
        }

        const actionText = user.is_admin
            ? 'demote to Voter'
            : 'promote to Administrator';
        if (
            !confirm(`Are you sure you want to ${actionText} for ${user.name}?`)
        ) {
            return;
        }

        router.post(
            `/admin/voters/${user.id}/toggle-role`,
            {},
            { preserveScroll: true },
        );
    };

    const handleToggleEligibility = (user: UserItem) => {
        if (!eventFilter) {
            alert(
                'Please select a specific Voting Event filter above before setting custom event eligibility.',
            );
            return;
        }

        router.post(
            `/admin/voters/${user.id}/toggle-eligibility`,
            {
                voting_event_id: eventFilter,
                is_eligible: !user.is_eligible,
            },
            { preserveScroll: true },
        );
    };

    const breadcrumbs = [
        { title: 'Administration', href: '/admin' },
        { title: 'Voter Directory', href: '/admin/voters' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Voter Directory & Role Management" />

            <div className="voting-container flex w-full flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                        Voter Directory & Role Management
                    </h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Manage registered voters, assign administrative
                        privileges, and configure event-specific voting
                        eligibility.
                    </p>
                </div>

                {/* Notifications */}
                {flash?.success && (
                    <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-800 dark:text-emerald-300">
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                        <span>{flash.success}</span>
                    </div>
                )}
                {flash?.error && (
                    <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-medium text-red-800 dark:text-red-300">
                        <ShieldAlert className="h-5 w-5 shrink-0 text-red-600" />
                        <span>{flash.error}</span>
                    </div>
                )}

                {/* Filters */}
                <form
                    onSubmit={handleSearch}
                    className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center"
                >
                    <div className="relative flex-1">
                        <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search by name or email address..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-lg border border-border bg-background py-2 pr-4 pl-9 text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                        >
                            <option value="">All Roles</option>
                            <option value="admin">Administrators</option>
                            <option value="voter">Voters</option>
                        </select>

                        <select
                            value={eventFilter}
                            onChange={(e) => setEventFilter(e.target.value)}
                            className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                        >
                            <option value="">All Events (General)</option>
                            {events.map((evt) => (
                                <option key={evt.id} value={evt.id}>
                                    Event: {evt.title}
                                </option>
                            ))}
                        </select>

                        <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted/80"
                        >
                            <Filter className="h-3.5 w-3.5" />
                            Apply
                        </button>
                    </div>
                </form>

                {/* Users Table */}
                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-border bg-muted/40 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                <tr>
                                    <th className="px-6 py-4">User Details</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4">Activity</th>
                                    {eventFilter && (
                                        <th className="px-6 py-4">
                                            Eligibility
                                        </th>
                                    )}
                                    <th className="px-6 py-4 text-right">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {users.data.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="p-8 text-center text-sm text-muted-foreground"
                                        >
                                            No users match the search criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    users.data.map((user) => (
                                        <tr
                                            key={user.id}
                                            className="transition-colors hover:bg-muted/20"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-foreground">
                                                    {user.name}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {user.email}
                                                </div>
                                            </td>

                                            <td className="px-6 py-4">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                                        user.is_admin
                                                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                                                            : 'bg-muted text-muted-foreground'
                                                    }`}
                                                >
                                                    <Shield className="h-3 w-3" />
                                                    {user.is_admin
                                                        ? 'Administrator'
                                                        : 'Voter'}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4 text-xs text-muted-foreground">
                                                <div className="flex items-center gap-1.5">
                                                    <Vote className="h-3.5 w-3.5 text-primary" />
                                                    <span className="font-semibold text-foreground">
                                                        {user.votes_count}
                                                    </span>{' '}
                                                    votes cast
                                                </div>
                                            </td>

                                            {eventFilter && (
                                                <td className="px-6 py-4">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleToggleEligibility(
                                                                user,
                                                            )
                                                        }
                                                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${
                                                            user.is_eligible
                                                                ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                                                                : 'bg-red-500/10 text-red-600 hover:bg-red-500/20'
                                                        }`}
                                                    >
                                                        {user.is_eligible ? (
                                                            <>
                                                                <UserCheck className="h-3 w-3" />
                                                                Eligible
                                                            </>
                                                        ) : (
                                                            <>
                                                                <UserX className="h-3 w-3" />
                                                                Excluded
                                                            </>
                                                        )}
                                                    </button>
                                                </td>
                                            )}

                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <button
                                                    type="button"
                                                    disabled={
                                                        auth.user.id === user.id
                                                    }
                                                    onClick={() =>
                                                        handleToggleRole(user)
                                                    }
                                                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                                                        auth.user.id === user.id
                                                            ? 'cursor-not-allowed border-border text-muted-foreground opacity-50'
                                                            : user.is_admin
                                                              ? 'border-border text-muted-foreground hover:bg-muted'
                                                              : 'border-purple-500/30 text-purple-600 hover:bg-purple-500/10'
                                                    }`}
                                                >
                                                    <ShieldCheck className="h-3.5 w-3.5" />
                                                    {user.is_admin
                                                        ? 'Make Voter'
                                                        : 'Promote to Admin'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {users.last_page > 1 && (
                        <div className="flex items-center justify-between border-t border-border px-6 py-4 text-xs text-muted-foreground">
                            <div>
                                Showing page {users.current_page} of{' '}
                                {users.last_page} ({users.total} total users)
                            </div>
                            <div className="flex gap-2">
                                {users.prev_page_url && (
                                    <Link
                                        href={users.prev_page_url}
                                        className="rounded-md border border-border px-3 py-1.5 font-medium hover:bg-muted"
                                    >
                                        Previous
                                    </Link>
                                )}
                                {users.next_page_url && (
                                    <Link
                                        href={users.next_page_url}
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
        </AppLayout>
    );
}
