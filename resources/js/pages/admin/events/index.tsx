import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    CheckCircle2,
    Edit3,
    Filter,
    Plus,
    Search,
    ShieldAlert,
    Trash2,
    Trophy,
    X,
} from 'lucide-react';
import { FormEvent, useState } from 'react';
import AppLayout from '@/layouts/app-layout';

type EventItem = {
    id: number;
    title: string;
    slug: string;
    description: string | null;
    banner_path: string | null;
    status: string;
    computed_status: string;
    starts_at: string | null;
    ends_at: string | null;
    reveal_date: string | null;
    results_visibility: string;
    allow_vote_changes: boolean;
    awards_count: number;
    votes_count: number;
    created_at: string;
};

type PaginatedEvents = {
    data: EventItem[];
    current_page: number;
    last_page: number;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
};

type Props = {
    events: PaginatedEvents;
    filters: {
        search?: string;
        status?: string;
    };
};

export default function EventsIndex({ events, filters }: Props) {
    const { flash } = usePage<{
        flash?: { success?: string; error?: string };
    }>().props;

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');

    // Create event form state
    const [form, setForm] = useState({
        title: '',
        slug: '',
        description: '',
        starts_at: '',
        ends_at: '',
        reveal_date: '',
        status: 'draft',
        results_visibility: 'after_closing',
        allow_vote_changes: false,
    });
    const [processing, setProcessing] = useState(false);

    const handleSearch = (e: FormEvent) => {
        e.preventDefault();
        router.get(
            '/admin/events',
            { search, status: statusFilter },
            { preserveState: true },
        );
    };

    const handleCreateEvent = (e: FormEvent) => {
        e.preventDefault();
        setProcessing(true);

        router.post('/admin/events', form, {
            onSuccess: () => {
                setIsCreateOpen(false);
                setForm({
                    title: '',
                    slug: '',
                    description: '',
                    starts_at: '',
                    ends_at: '',
                    reveal_date: '',
                    status: 'draft',
                    results_visibility: 'after_closing',
                    allow_vote_changes: false,
                });
            },
            onFinish: () => setProcessing(false),
        });
    };

    const handleDeleteEvent = (event: EventItem) => {
        if (
            !confirm(`Are you sure you want to delete event "${event.title}"?`)
        ) {
            return;
        }

        router.delete(`/admin/events/${event.id}`);
    };

    const breadcrumbs = [
        { title: 'Administration', href: '/admin' },
        { title: 'Voting Events', href: '/admin/events' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Manage Voting Events" />

            <div className="voting-container flex w-full flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                            Voting Events & Recognition
                        </h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            Create, configure, publish, and schedule
                            institutional awards and voting titles.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsCreateOpen(true)}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
                    >
                        <Plus className="h-4 w-4" />
                        New Voting Event
                    </button>
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
                            placeholder="Search by event title or description..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-lg border border-border bg-background py-2 pr-4 pl-9 text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                        >
                            <option value="">All Statuses</option>
                            <option value="draft">Draft</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="published">Published</option>
                            <option value="closed">Closed</option>
                            <option value="archived">Archived</option>
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

                {/* Table */}
                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-border bg-muted/40 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                <tr>
                                    <th className="px-6 py-4">Event Details</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Schedule</th>
                                    <th className="px-6 py-4">
                                        Awards & Ballots
                                    </th>
                                    <th className="px-6 py-4">
                                        Results Policy
                                    </th>
                                    <th className="px-6 py-4 text-right">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {events.data.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="p-8 text-center text-sm text-muted-foreground"
                                        >
                                            No voting events match the specified
                                            filter criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    events.data.map((event) => (
                                        <tr
                                            key={event.id}
                                            className="transition-colors hover:bg-muted/20"
                                        >
                                            <td className="px-6 py-4">
                                                <Link
                                                    href={`/admin/events/${event.id}`}
                                                    className="text-base font-bold text-foreground hover:text-primary hover:underline"
                                                >
                                                    {event.title}
                                                </Link>
                                                <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                                                    slug: /{event.slug}
                                                </div>
                                            </td>

                                            <td className="px-6 py-4">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                                                        event.computed_status ===
                                                        'published'
                                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                            : event.computed_status ===
                                                                'scheduled'
                                                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                                              : event.computed_status ===
                                                                  'draft'
                                                                ? 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400'
                                                                : 'bg-red-500/10 text-red-600 dark:text-red-400'
                                                    }`}
                                                >
                                                    {event.computed_status}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4 text-xs whitespace-nowrap text-muted-foreground">
                                                <div>
                                                    Starts:{' '}
                                                    {event.starts_at ||
                                                        'Immediate'}
                                                </div>
                                                <div>
                                                    Ends:{' '}
                                                    {event.ends_at ||
                                                        'Open-ended'}
                                                </div>
                                                {event.reveal_date && (
                                                    <div className="text-primary font-medium">
                                                        Reveal: {event.reveal_date}
                                                    </div>
                                                )}
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="text-xs font-semibold text-foreground">
                                                    {event.awards_count} Awards
                                                </div>
                                                <div className="mt-0.5 text-xs text-muted-foreground">
                                                    {event.votes_count} Votes
                                                    cast
                                                </div>
                                            </td>

                                            <td className="px-6 py-4 text-xs text-muted-foreground capitalize">
                                                <div>
                                                    Visibility:{' '}
                                                    {event.results_visibility.replace(
                                                        '_',
                                                        ' ',
                                                    )}
                                                </div>
                                                <div className="mt-0.5 text-[11px]">
                                                    {event.allow_vote_changes
                                                        ? 'Changes allowed'
                                                        : 'Final votes'}
                                                </div>
                                            </td>

                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link
                                                        href={`/admin/events/${event.id}`}
                                                        className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted"
                                                    >
                                                        <Edit3 className="h-3 w-3" />
                                                        Manage
                                                    </Link>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleDeleteEvent(
                                                                event,
                                                            )
                                                        }
                                                        className="inline-flex items-center gap-1 rounded-md border border-red-500/30 p-1 text-xs font-semibold text-red-600 hover:bg-red-500/10"
                                                        title="Delete event"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {events.last_page > 1 && (
                        <div className="flex items-center justify-between border-t border-border px-6 py-4 text-xs text-muted-foreground">
                            <div>
                                Showing page {events.current_page} of{' '}
                                {events.last_page} ({events.total} total)
                            </div>
                            <div className="flex gap-2">
                                {events.prev_page_url && (
                                    <Link
                                        href={events.prev_page_url}
                                        className="rounded-md border border-border px-3 py-1.5 font-medium hover:bg-muted"
                                    >
                                        Previous
                                    </Link>
                                )}
                                {events.next_page_url && (
                                    <Link
                                        href={events.next_page_url}
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

            {/* Create Event Modal */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200 fade-in">
                    <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-border/70 pb-4">
                            <div className="flex items-center gap-2">
                                <Trophy className="h-5 w-5 text-primary" />
                                <h2 className="text-lg font-bold text-foreground">
                                    Create New Voting Event
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsCreateOpen(false)}
                                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form
                            onSubmit={handleCreateEvent}
                            className="mt-5 space-y-4"
                        >
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-foreground">
                                    Event Title *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Annual Recognition Awards 2026"
                                    value={form.title}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            title: e.target.value,
                                        })
                                    }
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-foreground">
                                    Unique URL Slug (Optional - auto-generated
                                    if blank)
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. annual-recognition-awards-2026"
                                    value={form.slug}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            slug: e.target.value,
                                        })
                                    }
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-foreground">
                                    Description / Voting Overview
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="Explain the background, purpose, and rules of this voting event..."
                                    value={form.description}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            description: e.target.value,
                                        })
                                    }
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-foreground">
                                        Voting Starts At
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={form.starts_at}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                starts_at: e.target.value,
                                            })
                                        }
                                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-foreground">
                                        Voting Ends At
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={form.ends_at}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                ends_at: e.target.value,
                                            })
                                        }
                                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-foreground">
                                    Reveal Date
                                </label>
                                <input
                                    type="date"
                                    value={form.reveal_date}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            reveal_date: e.target.value,
                                        })
                                    }
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                />
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                    On and after this date, the winners' names, designation, area of assignment, and photo will be officially revealed in Tabulation Results.
                                </p>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-foreground">
                                        Initial Status *
                                    </label>
                                    <select
                                        value={form.status}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                status: e.target.value,
                                            })
                                        }
                                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                    >
                                        <option value="draft">
                                            Draft (Private)
                                        </option>
                                        <option value="scheduled">
                                            Scheduled
                                        </option>
                                        <option value="published">
                                            Published (Active)
                                        </option>
                                        <option value="closed">Closed</option>
                                        <option value="archived">
                                            Archived
                                        </option>
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-foreground">
                                        Results Visibility *
                                    </label>
                                    <select
                                        value={form.results_visibility}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                results_visibility:
                                                    e.target.value,
                                            })
                                        }
                                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                    >
                                        <option value="after_closing">
                                            After Event Closes
                                        </option>
                                        <option value="public">
                                            Public Live (Always Visible)
                                        </option>
                                        <option value="voters_only">
                                            Voters Only (While Logged In)
                                        </option>
                                        <option value="hidden">
                                            Hidden from Voters (Admin Only)
                                        </option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="allow_vote_changes"
                                    checked={form.allow_vote_changes}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            allow_vote_changes:
                                                e.target.checked,
                                        })
                                    }
                                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                                />
                                <label
                                    htmlFor="allow_vote_changes"
                                    className="cursor-pointer text-xs font-medium text-foreground"
                                >
                                    Allow voters to change their vote before the
                                    voting period ends
                                </label>
                            </div>

                            <div className="mt-6 flex items-center justify-end gap-3 border-t border-border/70 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateOpen(false)}
                                    className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
                                >
                                    {processing
                                        ? 'Creating...'
                                        : 'Create Voting Event'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
