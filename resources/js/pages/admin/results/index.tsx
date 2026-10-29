import { Head, router } from '@inertiajs/react';
import {
    Award,
    Building2,
    Calculator,
    CheckCircle2,
    Clock,
    Crown,
    FileSpreadsheet,
    MapPin,
    Trophy,
    User,
    Users,
    Vote,
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';

type NomineeResult = {
    id: number;
    name: string;
    photo_path: string | null;
    department: string | null;
    organization: string | null;
    status: string;
    votes_count: number;
    total_points: number;
    final_score: string;
    final_score_num: number;
    dc_score: string;
    dc_weighted_score: string;
    dc_has_voted: boolean;
    sh_count: number;
    sh_average: string;
    sh_weighted_score: string;
    rank: number;
    is_tied?: boolean;
};

type AwardResult = {
    id: number;
    name: string;
    status: string;
    total_votes: number;
    distinct_ballots?: number;
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
                        <div className="flex flex-col gap-10">
                            {awards.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
                                    No award categories found for this voting
                                    event.
                                </div>
                            ) : (
                                awards.map((award, index) => (
                                    <div
                                        key={award.id}
                                        className="overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8"
                                    >
                                        <div className="flex flex-col gap-2 border-b border-border/50 pb-5 md:flex-row md:items-center md:justify-between">
                                            <div>
                                                <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                                    Category {index + 1}
                                                </div>
                                                <h3 className="mt-0.5 text-xl font-bold tracking-tight text-foreground md:text-2xl">
                                                    {award.name}
                                                </h3>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-3">
                                                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                                    <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                                    <span>
                                                        {award.distinct_ballots ?? award.total_votes} Participating Voters
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {award.nominees.length === 0 ? (
                                            <div className="mt-6 rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                                                No nominees registered in this award category.
                                            </div>
                                        ) : (
                                            <div className="mt-6 flex flex-col gap-8">
                                                {/* Matrix Table (Table 3 from ANINAG 2026 Sample Voting Matrix) */}
                                                <div>
                                                    <div className="mb-3 flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Award className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                                            <h4 className="text-sm font-bold text-foreground">
                                                                3. Tabulation Matrix (50% DC + 50% Section Heads)
                                                            </h4>
                                                        </div>
                                                        <span className="text-xs text-muted-foreground italic">
                                                            DC User ID: 2 (Crislea Dalauta Celeste)
                                                        </span>
                                                    </div>

                                                    <div className="overflow-x-auto rounded-xl border border-border shadow-xs">
                                                        <table className="w-full text-left text-xs">
                                                            <thead className="border-b border-border bg-emerald-600 text-white font-semibold uppercase">
                                                                <tr>
                                                                    <th className="px-4 py-3">Nominee</th>
                                                                    <th className="px-4 py-3 text-center">DC Score</th>
                                                                    <th className="px-4 py-3 text-center">DC Weighted Score (50%)</th>
                                                                    <th className="px-4 py-3 text-center">Section Heads' Average</th>
                                                                    <th className="px-4 py-3 text-center">SH Weighted Score (50%)</th>
                                                                    <th className="px-4 py-3 text-right">Final Score</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-border/60 bg-card">
                                                                {award.nominees.map((nominee) => {
                                                                    const isWinner = nominee.rank === 1 && nominee.final_score_num > 0;
                                                                    return (
                                                                        <tr
                                                                            key={nominee.id}
                                                                            className={`transition-colors hover:bg-muted/20 ${
                                                                                isWinner ? 'bg-emerald-500/[0.04]' : ''
                                                                            }`}
                                                                        >
                                                                            <td className="px-4 py-3 font-semibold text-foreground">
                                                                                <div className="flex items-center gap-3">
                                                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                                                                                        {nominee.photo_path ? (
                                                                                            <img
                                                                                                src={nominee.photo_path}
                                                                                                alt={nominee.name}
                                                                                                className="h-full w-full object-cover"
                                                                                            />
                                                                                        ) : (
                                                                                            <User className="h-4 w-4 text-muted-foreground/60" />
                                                                                        )}
                                                                                    </div>
                                                                                    <div>
                                                                                        <div className="flex items-center gap-1.5 font-bold">
                                                                                            <span>{nominee.name}</span>
                                                                                            {isWinner && (
                                                                                                <Crown className="h-3.5 w-3.5 text-amber-500" />
                                                                                            )}
                                                                                        </div>
                                                                                        {nominee.department && (
                                                                                            <div className="text-[11px] font-normal text-muted-foreground">
                                                                                                {nominee.department}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-4 py-3 text-center font-mono font-medium text-foreground">
                                                                                {nominee.dc_has_voted ? (
                                                                                    `${nominee.dc_score}%`
                                                                                ) : (
                                                                                    <span className="text-muted-foreground italic">Pending</span>
                                                                                )}
                                                                            </td>
                                                                            <td className="px-4 py-3 text-center font-mono font-bold text-primary">
                                                                                {nominee.dc_has_voted ? (
                                                                                    `${nominee.dc_weighted_score}%`
                                                                                ) : (
                                                                                    <span className="text-muted-foreground italic">0.00%</span>
                                                                                )}
                                                                            </td>
                                                                            <td className="px-4 py-3 text-center font-mono font-medium text-foreground">
                                                                                {nominee.sh_count > 0 ? (
                                                                                    <div>
                                                                                        <span>{nominee.sh_average}%</span>
                                                                                        <span className="block text-[10px] text-muted-foreground">
                                                                                            ({nominee.sh_count} voter{nominee.sh_count !== 1 ? 's' : ''})
                                                                                        </span>
                                                                                    </div>
                                                                                ) : (
                                                                                    <span className="text-muted-foreground italic">0 votes</span>
                                                                                )}
                                                                            </td>
                                                                            <td className="px-4 py-3 text-center font-mono font-bold text-primary">
                                                                                {nominee.sh_weighted_score}%
                                                                            </td>
                                                                            <td className="px-4 py-3 text-right">
                                                                                <span className="font-mono text-sm font-black text-emerald-600 dark:text-emerald-400">
                                                                                    {nominee.final_score}%
                                                                                </span>
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>

                                                    <div className="mt-2 text-[11px] text-muted-foreground">
                                                        <strong>Formula:</strong> Final Score = (DC Score × 0.50) + (Average Section Heads' Score × 0.50)
                                                    </div>
                                                </div>

                                                {/* Final Ranking Table (Table 4 from ANINAG 2026 Sample Voting Matrix) */}
                                                <div>
                                                    <div className="mb-3 flex items-center gap-2">
                                                        <Trophy className="h-4 w-4 text-amber-500" />
                                                        <h4 className="text-sm font-bold text-foreground">
                                                            4. Final Ranking
                                                        </h4>
                                                    </div>

                                                    <div className="max-w-xl overflow-x-auto rounded-xl border border-border shadow-xs">
                                                        <table className="w-full text-left text-xs">
                                                            <thead className="border-b border-border bg-emerald-700 text-white font-semibold uppercase">
                                                                <tr>
                                                                    <th className="w-20 px-4 py-2.5 text-center">Rank</th>
                                                                    <th className="px-4 py-2.5">Nominee</th>
                                                                    <th className="px-4 py-2.5 text-right">Final Weighted Score</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-border/60 bg-card">
                                                                {award.nominees.map((nominee) => (
                                                                    <tr
                                                                        key={nominee.id}
                                                                        className={`transition-colors hover:bg-muted/20 ${
                                                                            nominee.rank === 1 ? 'bg-amber-500/[0.05] font-semibold' : ''
                                                                        }`}
                                                                    >
                                                                        <td className="px-4 py-2.5 text-center">
                                                                            <span
                                                                                className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold ${
                                                                                    nominee.rank === 1
                                                                                        ? 'bg-amber-500 text-white'
                                                                                        : nominee.rank === 2
                                                                                          ? 'bg-neutral-300 text-foreground dark:bg-neutral-700'
                                                                                          : nominee.rank === 3
                                                                                            ? 'bg-amber-700 text-white'
                                                                                            : 'bg-muted text-muted-foreground'
                                                                                }`}
                                                                            >
                                                                                {nominee.rank === 1 ? (
                                                                                    <Crown className="h-3.5 w-3.5" />
                                                                                ) : (
                                                                                    nominee.rank
                                                                                )}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-4 py-2.5 text-foreground">
                                                                            {nominee.name}
                                                                        </td>
                                                                        <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                                            {nominee.final_score}%
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
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
