import { Head, router } from '@inertiajs/react';
import { Building2, Crown, FileSpreadsheet, User, Users, Vote } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';

type NomineeResult = {
    id: number;
    name: string;
    photo_path: string | null;
    department: string | null;
    organization: string | null;
    status: string;
    votes_count: number;
    average_score?: string | number;
    percentage: number;
    rank: number;
};

type AwardResult = {
    id: number;
    name: string;
    status: string;
    total_votes: number;
    nominees: NomineeResult[];
};

type EventOption = {
    id: number;
    title: string;
    slug: string;
    status: string;
};

type SelectedEvent = {
    id: number;
    title: string;
    slug: string;
    status: string;
    results_visibility: string;
    total_votes: number;
    distinct_voters: number;
};

type Props = {
    events: EventOption[];
    selected_event_id: number | null;
    selected_event: SelectedEvent | null;
    awards: AwardResult[];
};

export default function AdminResults({
    events,
    selected_event_id,
    selected_event,
    awards,
}: Props) {
    const handleEventChange = (eventId: string) => {
        router.get(
            '/admin/results',
            { event_id: eventId },
            { preserveState: true },
        );
    };

    const handleExportCsv = () => {
        if (!selected_event) return;
        window.location.href = `/admin/results/export?event_id=${selected_event.id}`;
    };

    const breadcrumbs = [
        { title: 'Administration', href: '/admin' },
        { title: 'Results & Reports', href: '/admin/results' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Voting Results & Tabulation Reports" />

            <div className="voting-container flex w-full flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                                Voting Results & Tabulation
                            </h1>
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Official Tabulation
                            </span>
                        </div>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            Live tabulation, percentage breakdowns, nominee
                            rankings, and official CSV exports.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {events.length > 0 && (
                            <select
                                value={selected_event_id || ''}
                                onChange={(e) =>
                                    handleEventChange(e.target.value)
                                }
                                className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                            >
                                {events.map((evt) => (
                                    <option key={evt.id} value={evt.id}>
                                        {evt.title} ({evt.status})
                                    </option>
                                ))}
                            </select>
                        )}

                        <button
                            type="button"
                            onClick={handleExportCsv}
                            disabled={!selected_event}
                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                        >
                            <FileSpreadsheet className="h-4 w-4" />
                            Export to CSV
                        </button>
                    </div>
                </div>

                {!selected_event ? (
                    <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
                        No voting events available to tabulate.
                    </div>
                ) : (
                    <>
                        {/* Summary Metrics */}
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="relative overflow-hidden rounded-xl border border-emerald-500/20 bg-card p-5 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                        Total Ballots Cast
                                    </div>
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                        <Vote className="h-4 w-4" />
                                    </div>
                                </div>
                                <div className="mt-2 text-2xl font-extrabold text-foreground">
                                    {selected_event.total_votes}
                                </div>
                                <div className="mt-0.5 text-xs text-muted-foreground">
                                    Across all categories in this event
                                </div>
                                <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-emerald-600 to-emerald-400" />
                            </div>

                            <div className="relative overflow-hidden rounded-xl border border-emerald-500/20 bg-card p-5 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                        Unique Participating Voters
                                    </div>
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                        <Users className="h-4 w-4" />
                                    </div>
                                </div>
                                <div className="mt-2 text-2xl font-extrabold text-foreground">
                                    {selected_event.distinct_voters}
                                </div>
                                <div className="mt-0.5 text-xs text-muted-foreground">
                                    Verified voter accounts
                                </div>
                                <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-emerald-600 to-emerald-400" />
                            </div>

                            <div className="relative overflow-hidden rounded-xl border border-emerald-500/20 bg-card p-5 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                        Results Visibility
                                    </div>
                                    <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 capitalize dark:text-emerald-400">
                                        {selected_event.status}
                                    </span>
                                </div>
                                <div className="mt-2 text-lg font-bold text-foreground capitalize">
                                    {selected_event.results_visibility.replace(
                                        '_',
                                        ' ',
                                    )}
                                </div>
                                <div className="mt-0.5 text-xs text-muted-foreground">
                                    Event Status:{' '}
                                    <strong className="capitalize text-emerald-600 dark:text-emerald-400">
                                        {selected_event.status}
                                    </strong>
                                </div>
                                <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-emerald-600 to-emerald-400" />
                            </div>
                        </div>

                        {/* Category Results */}
                        <div className="flex flex-col gap-8">
                            {awards.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
                                    No award categories found for this voting
                                    event.
                                </div>
                            ) : (
                                awards.map((award, index) => (
                                    <div
                                        key={award.id}
                                        className="overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm"
                                    >
                                        <div className="flex items-center justify-between border-b border-border/50 pb-4">
                                            <div>
                                                <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                                    Category {index + 1}
                                                </span>
                                                <h3 className="mt-0.5 text-xl font-bold text-foreground">
                                                    {award.name}
                                                </h3>
                                            </div>

                                            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                                <Vote className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                                <span>
                                                    {award.total_votes} Category
                                                    Points
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mt-6 flex flex-col gap-3">
                                            {award.nominees.length === 0 ? (
                                                <div className="rounded-xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
                                                    No nominees registered in
                                                    this award category.
                                                </div>
                                            ) : (
                                                award.nominees.map(
                                                    (nominee) => {
                                                        const isLeader =
                                                            nominee.rank ===
                                                                1 &&
                                                            nominee.votes_count >
                                                                0;

                                                        return (
                                                            <div
                                                                key={nominee.id}
                                                                className={`relative rounded-xl border p-4 transition-all ${
                                                                    isLeader
                                                                        ? 'border-emerald-500/40 bg-emerald-500/[0.04] ring-1 ring-emerald-500/20'
                                                                        : 'border-border/70 bg-card'
                                                                }`}
                                                            >
                                                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                                    <div className="flex items-center gap-3">
                                                                        <div
                                                                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                                                                                isLeader
                                                                                    ? 'bg-emerald-600 text-white shadow-xs'
                                                                                    : 'bg-muted text-muted-foreground'
                                                                            }`}
                                                                        >
                                                                            {isLeader ? (
                                                                                <Crown className="h-4 w-4" />
                                                                            ) : (
                                                                                `#${nominee.rank}`
                                                                            )}
                                                                        </div>

                                                                        <div className="flex items-center gap-3">
                                                                            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted text-muted-foreground shadow-sm">
                                                                                {nominee.photo_path ? (
                                                                                    <img
                                                                                        src={
                                                                                            nominee.photo_path
                                                                                        }
                                                                                        alt={
                                                                                            nominee.name
                                                                                        }
                                                                                        className="h-full w-full object-cover"
                                                                                    />
                                                                                ) : (
                                                                                    <User className="h-7 w-7 text-muted-foreground/50" />
                                                                                )}
                                                                            </div>
                                                                            <div>
                                                                                <div className={`text-sm font-bold ${isLeader ? 'text-emerald-950 dark:text-emerald-200' : 'text-foreground'}`}>
                                                                                    {
                                                                                        nominee.name
                                                                                    }
                                                                                </div>
                                                                                {nominee.department && (
                                                                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                                        <Building2 className="h-3 w-3" />
                                                                                        <span>
                                                                                            {
                                                                                                nominee.department
                                                                                            }
                                                                                        </span>
                                                                                    </div>
                                                                                )}
                                                                                {nominee.organization && (
                                                                                    <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                                                                                        <Users className="h-3 w-3" />
                                                                                        <span>
                                                                                            {
                                                                                                nominee.organization
                                                                                            }
                                                                                        </span>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center gap-4 text-right">
                                                                        <div>
                                                                            <div className={`text-base font-extrabold ${isLeader ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                                                                                {
                                                                                    nominee.average_score ?? nominee.votes_count
                                                                                }{' '}
                                                                                avg
                                                                            </div>
                                                                            <div className={`text-xs font-semibold ${isLeader ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                                                                                {
                                                                                    nominee.percentage
                                                                                }
                                                                                %
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                                                                    <div
                                                                        className={`h-full transition-all duration-700 ${
                                                                            isLeader
                                                                                ? 'bg-gradient-to-r from-emerald-600 to-emerald-500'
                                                                                : 'bg-emerald-600/50 dark:bg-emerald-500/40'
                                                                        }`}
                                                                        style={{
                                                                            width: `${nominee.percentage}%`,
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        );
                                                    },
                                                )
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}
            </div>
        </AppLayout>
    );
}
