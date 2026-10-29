import { Head, Link, router } from '@inertiajs/react';
import {
    Award,
    Briefcase,
    CheckCircle2,
    Clock,
    Filter,
    History,
    MapPin,
    Vote,
    X,
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';

type VoteHistoryItem = {
    id: number;
    event_title: string;
    event_slug: string | null;
    award_name: string;
    nominee_name: string;
    nominee_department: string | null;
    nominee_organization: string | null;
    rank?: number | null;
    rank_label?: string;
    score?: number;
    score_formatted?: string;
    voted_at: string;
};

type PaginatedData<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
};

type EventOption = {
    id: number;
    title: string;
    slug: string;
};

type AwardOption = {
    id: number;
    name: string;
    voting_event_id: number;
};

type Props = {
    votes: PaginatedData<VoteHistoryItem>;
    events: EventOption[];
    awards: AwardOption[];
    selected_event_id: number | null;
    selected_award_id: number | null;
};

export default function VotingHistory({
    votes,
    events = [],
    awards = [],
    selected_event_id,
    selected_award_id,
}: Props) {
    const breadcrumbs = [
        { title: 'Voting Events', href: '/dashboard' },
        { title: 'My Voting History', href: '/voting-history' },
    ];

    const hasActiveFilters = Boolean(selected_event_id || selected_award_id);

    const handleEventChange = (eventId: string) => {
        const params: Record<string, string | number> = {};
        if (eventId) {
            params.event_id = eventId;
        }
        router.get('/voting-history', params, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleAwardChange = (awardId: string) => {
        const params: Record<string, string | number> = {};
        if (selected_event_id) {
            params.event_id = selected_event_id;
        }
        if (awardId) {
            params.award_id = awardId;
        }
        router.get('/voting-history', params, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleClearFilters = () => {
        router.get('/voting-history', {}, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="My Voting History" />

            <div className="voting-container flex w-full flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
                {/* Header */}
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                        My Voting Activity
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Review your verified voting record across past and
                        current recognition events. Your choices are recorded
                        securely and privately.
                    </p>
                </div>

                {/* Filter Controls */}
                <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                            <Filter className="h-3.5 w-3.5 text-primary" />
                            <span>Filter By:</span>
                        </div>

                        {/* Event Filter */}
                        <div className="flex items-center gap-2">
                            <label
                                htmlFor="event-filter"
                                className="sr-only"
                            >
                                Voting Event
                            </label>
                            <select
                                id="event-filter"
                                value={selected_event_id ?? ''}
                                onChange={(e) => handleEventChange(e.target.value)}
                                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                            >
                                <option value="">All Voting Events ({events.length})</option>
                                {events.map((evt) => (
                                    <option key={evt.id} value={evt.id}>
                                        {evt.title}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Award Category Filter */}
                        <div className="flex items-center gap-2">
                            <label
                                htmlFor="award-filter"
                                className="sr-only"
                            >
                                Award Category
                            </label>
                            <select
                                id="award-filter"
                                value={selected_award_id ?? ''}
                                onChange={(e) => handleAwardChange(e.target.value)}
                                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                            >
                                <option value="">All Award Categories ({awards.length})</option>
                                {awards.map((awd) => (
                                    <option key={awd.id} value={awd.id}>
                                        {awd.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Clear Filters Button */}
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={handleClearFilters}
                                className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/60 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                                <X className="h-3.5 w-3.5" />
                                Clear Filters
                            </button>
                        )}
                    </div>

                    <div className="text-xs font-medium text-muted-foreground">
                        Total Recorded Votes:{' '}
                        <span className="font-bold text-foreground">
                            {votes.total}
                        </span>
                    </div>
                </div>

                {votes.data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border p-12 text-center">
                        <div className="rounded-full bg-muted p-4 text-muted-foreground">
                            <History className="h-8 w-8" />
                        </div>
                        <h3 className="mt-4 text-lg font-semibold">
                            {hasActiveFilters
                                ? 'No Votes Found'
                                : 'No Votes Recorded Yet'}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {hasActiveFilters
                                ? 'No voting records match your selected event and award category filters.'
                                : 'You have not cast any votes in our active or concluded awards.'}
                        </p>
                        {hasActiveFilters ? (
                            <button
                                type="button"
                                onClick={handleClearFilters}
                                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                            >
                                <X className="h-3.5 w-3.5" />
                                Clear Selected Filters
                            </button>
                        ) : (
                            <Link
                                href="/dashboard"
                                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                            >
                                <Vote className="h-4 w-4" />
                                Browse Active Voting Events
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-border bg-muted/40 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                    <tr>
                                        <th className="px-6 py-4">
                                            Voting Event
                                        </th>
                                        <th className="px-6 py-4">
                                            Award Category
                                        </th>
                                        <th className="px-6 py-4">Nominee</th>
                                        <th className="px-6 py-4">
                                            Given Score / %
                                        </th>
                                        <th className="px-6 py-4">
                                            Recorded At
                                        </th>
                                        <th className="px-6 py-4 text-right">
                                            Status
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60">
                                    {votes.data.map((vote) => (
                                        <tr
                                            key={vote.id}
                                            className="transition-colors hover:bg-muted/20"
                                        >
                                            <td className="px-6 py-4 font-semibold text-foreground">
                                                {vote.event_slug ? (
                                                    <Link
                                                        href={`/voting/${vote.event_slug}`}
                                                        className="transition-colors hover:text-primary hover:underline"
                                                    >
                                                        {vote.event_title}
                                                    </Link>
                                                ) : (
                                                    vote.event_title
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 font-medium text-foreground">
                                                    <Award className="h-4 w-4 shrink-0 text-primary" />
                                                    <span>
                                                        {vote.award_name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-foreground">
                                                    {vote.nominee_name}
                                                </div>
                                                {vote.nominee_department && (
                                                    <div
                                                        className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground"
                                                        title={`Designation: ${vote.nominee_department}`}
                                                    >
                                                        <Briefcase className="h-3 w-3 shrink-0 text-primary/70" />
                                                        <span>
                                                            {
                                                                vote.nominee_department
                                                            }
                                                        </span>
                                                    </div>
                                                )}
                                                {vote.nominee_organization && (
                                                    <div
                                                        className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground"
                                                        title={`Area of Assignment: ${vote.nominee_organization}`}
                                                    >
                                                        <MapPin className="h-3 w-3 shrink-0 text-primary/70" />
                                                        <span>
                                                            {
                                                                vote.nominee_organization
                                                            }
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {vote.score !== undefined && vote.score !== null ? (
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="inline-flex items-center gap-1 font-mono text-sm font-bold text-primary">
                                                            {vote.score.toFixed(2)}%
                                                        </span>
                                                        <span className="text-[11px] text-muted-foreground">
                                                            Criteria Score: {vote.score.toFixed(1)}/100
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                                                        Rank {vote.rank ?? 1}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-xs whitespace-nowrap text-muted-foreground">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span>{vote.voted_at}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                    Verified & Counted
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {votes.last_page > 1 && (
                            <div className="flex items-center justify-between border-t border-border px-6 py-4 text-xs text-muted-foreground">
                                <div>
                                    Showing page {votes.current_page} of{' '}
                                    {votes.last_page} ({votes.total} total
                                    votes)
                                </div>
                                <div className="flex gap-2">
                                    {votes.prev_page_url && (
                                        <Link
                                            href={votes.prev_page_url}
                                            className="rounded-md border border-border px-3 py-1.5 font-medium hover:bg-muted"
                                        >
                                            Previous
                                        </Link>
                                    )}
                                    {votes.next_page_url && (
                                        <Link
                                            href={votes.next_page_url}
                                            className="rounded-md border border-border px-3 py-1.5 font-medium hover:bg-muted"
                                        >
                                            Next
                                        </Link>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
