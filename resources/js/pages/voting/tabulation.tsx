import { Head, Link, router } from '@inertiajs/react';
import {
    Briefcase,
    Building2,
    Calculator,
    Crown,
    MapPin,
    Sparkles,
    Trophy,
    User,
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
    is_masked?: boolean;
    is_winner?: boolean;
};

type AwardResult = {
    id: number;
    name: string;
    status?: string;
    total_votes: number;
    nominees: NomineeResult[];
};

type EventOption = {
    id: number;
    title: string;
    slug: string;
    status: string;
    reveal_date?: string | null;
};

type SelectedEvent = {
    id: number;
    title: string;
    slug: string;
    status: string;
    reveal_date?: string | null;
    results_visibility?: string;
    total_votes: number;
    distinct_voters: number;
};

type Props = {
    events: EventOption[];
    selected_event_id: number | null;
    selected_event: SelectedEvent | null;
    awards: AwardResult[];
    can_reveal: boolean;
    is_reveal_date_reached?: boolean;
};

export default function TabulationResult({
    events,
    selected_event_id,
    selected_event,
    awards,
    can_reveal,
    is_reveal_date_reached = false,
}: Props) {
    const handleEventChange = (eventId: string) => {
        router.get(
            '/tabulation-results',
            { event_id: eventId },
            { preserveState: true },
        );
    };

    const categoryWinners = awards
        .map((award) => {
            if (!award.nominees || award.nominees.length === 0) return null;
            // Find all nominees sharing rank 1 (tied winners)
            const winners = award.nominees.filter((n) => n.rank === 1);
            if (winners.length === 0) return null;
            return {
                award,
                winners,
            };
        })
        .filter(Boolean) as { award: AwardResult; winners: NomineeResult[] }[];

    const totalWinnersCount = categoryWinners.reduce(
        (sum, cw) => sum + cw.winners.length,
        0,
    );

    const breadcrumbs = [
        { title: 'Voting Events', href: '/dashboard' },
        {
            title: selected_event
                ? `Tabulation (${selected_event.title})`
                : 'Tabulation Result',
            href: '/tabulation-results',
        },
    ];

    const pageTitle = selected_event
        ? `Voting Results & Tabulation (${selected_event.title})`
        : 'Voting Results & Tabulation';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={pageTitle} />

            <div className="voting-container flex w-full flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                            Voting Results & Tabulation
                            {selected_event && (
                                <span className="text-primary"> ({selected_event.title})</span>
                            )}
                        </h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            {can_reveal
                                ? 'Live tabulation, percentage breakdowns, and nominee rankings.'
                                : 'Live scores and rankings. Nominee identities are sealed for the grand announcement ceremony.'}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {events.length > 0 && (
                            <select
                                value={selected_event_id || ''}
                                onChange={(e) =>
                                    handleEventChange(e.target.value)
                                }
                                className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                            >
                                {events.map((evt) => (
                                    <option key={evt.id} value={evt.id}>
                                        {evt.title} ({evt.status})
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                {!selected_event ? (
                    <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
                        No voting events available to tabulate.
                    </div>
                ) : (
                    <>


                        {/* Event Winners Showcase */}
                        {categoryWinners.length > 0 && (
                            <div className="overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.06] via-card to-card p-6 shadow-sm dark:border-emerald-500/25">
                                <div className="flex flex-col gap-2 border-b border-emerald-500/20 pb-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                                            <Trophy className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold tracking-tight text-foreground md:text-xl">
                                                Event Category Winners
                                            </h2>
                                            <p className="text-xs text-muted-foreground">
                                                {can_reveal || is_reveal_date_reached
                                                    ? 'Category winners for this event based on live verified ballots.'
                                                    : 'Top ranking contenders in this event! Identities sealed for the Grand Announcement ceremony.'}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="inline-flex shrink-0 items-center gap-1 self-start rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 sm:self-center">
                                        <Crown className="h-3.5 w-3.5" />
                                        {totalWinnersCount} {totalWinnersCount === 1 ? 'Winner' : 'Winners'}
                                    </span>
                                </div>

                                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                                    {categoryWinners.map(({ award, winners }) => {
                                        const isTie = winners.length > 1;
                                        const firstWinner = winners[0];

                                        return (
                                            <Link
                                                key={award.id}
                                                href={`/tabulation-results/breakdown/${award.id}`}
                                                className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-emerald-500/40 bg-card p-3 shadow-sm transition-all hover:border-emerald-500 hover:shadow-lg hover:ring-2 hover:ring-emerald-500/30 cursor-pointer"
                                                title={`Click to view computation breakdown for ${award.name}`}
                                            >
                                                <div>
                                                    <div className="flex items-center justify-between gap-1">
                                                        <span
                                                            className="line-clamp-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase"
                                                            title={award.name}
                                                        >
                                                            {award.name}
                                                        </span>
                                                        {isTie ? (
                                                            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-black text-white shadow-2xs">
                                                                <Crown className="h-2.5 w-2.5" />
                                                                Tie ({winners.length})
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[9px] font-black text-white shadow-2xs">
                                                                <Crown className="h-2.5 w-2.5" />
                                                                Winner
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Display all names of the tie breakers in the same card */}
                                                    <div className="mt-2.5 flex flex-col divide-y divide-border/40">
                                                        {winners.map((winner, idx) => {
                                                            const isWinnerRevealed = can_reveal || !winner.is_masked;

                                                            return (
                                                                <div
                                                                    key={winner.id}
                                                                    className={`flex items-center gap-2 ${idx > 0 ? 'pt-2' : ''} ${idx < winners.length - 1 ? 'pb-2' : ''}`}
                                                                >
                                                                    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-emerald-500/30 bg-muted shadow-sm">
                                                                        {isWinnerRevealed ? (
                                                                            winner.photo_path && winner.photo_path !== '/images/user_unknown.png' ? (
                                                                                <img
                                                                                    src={winner.photo_path}
                                                                                    alt={winner.name}
                                                                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                                                />
                                                                            ) : (
                                                                                <User className="h-4 w-4 text-muted-foreground/50" />
                                                                            )
                                                                        ) : (
                                                                            <img
                                                                                src="/images/user_unknown.png"
                                                                                alt="Sealed Winner"
                                                                                className="h-full w-full object-cover"
                                                                            />
                                                                        )}
                                                                    </div>

                                                                    <div className="min-w-0 flex-1">
                                                                        <div
                                                                            className="truncate text-xs font-bold text-foreground transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400"
                                                                            title={winner.name}
                                                                        >
                                                                            {winner.name}
                                                                        </div>
                                                                        {isWinnerRevealed && winner.department ? (
                                                                            <div
                                                                                className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-muted-foreground"
                                                                                title={`Designation: ${winner.department}`}
                                                                            >
                                                                                <Briefcase className="h-2.5 w-2.5 shrink-0 text-primary/70" />
                                                                                <span className="truncate">
                                                                                    {winner.department}
                                                                                </span>
                                                                            </div>
                                                                        ) : null}
                                                                        {isWinnerRevealed && winner.organization ? (
                                                                            <div
                                                                                className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-muted-foreground"
                                                                                title={`Area of Assignment: ${winner.organization}`}
                                                                            >
                                                                                <MapPin className="h-2.5 w-2.5 shrink-0 text-primary/70" />
                                                                                <span className="truncate">
                                                                                    {winner.organization}
                                                                                </span>
                                                                            </div>
                                                                        ) : null}
                                                                        {!isWinnerRevealed && (
                                                                            <div className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                                                                <Sparkles className="h-2.5 w-2.5 shrink-0" />
                                                                                <span className="truncate">
                                                                                    Sealed
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                <div>
                                                    <div className="mt-2.5 flex items-center justify-between border-t border-border/60 pt-2 text-[11px] font-semibold">
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {isTie ? 'Tie Final Score:' : 'Final Score:'}
                                                        </span>
                                                        <div className="flex items-center gap-1">
                                                            <span className="font-mono text-xs font-black text-foreground">
                                                                {firstWinner.final_score}%
                                                            </span>
                                                            <span className="text-[10px] text-muted-foreground">
                                                                (DC {firstWinner.dc_weighted_score}% + SH {firstWinner.sh_weighted_score}%)
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="mt-2 flex items-center justify-center gap-1 rounded-md bg-emerald-500/10 py-1 text-[10px] font-semibold text-emerald-700 transition-colors group-hover:bg-emerald-600 group-hover:text-white dark:text-emerald-300">
                                                        <Calculator className="h-3 w-3" />
                                                        <span>View Computation Breakdown &rarr;</span>
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Category Results in 4 Columns */}
                        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {awards.length === 0 ? (
                                <div className="col-span-full rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
                                    No award categories found for this voting event.
                                </div>
                            ) : (
                                awards.map((award, index) => (
                                    <div
                                        key={award.id}
                                        className="overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm"
                                    >
                                        <div className="flex items-start justify-between gap-2 border-b border-border/50 pb-3">
                                            <div className="min-w-0">
                                                <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                                    Category {index + 1}
                                                </span>
                                                <h3 className="mt-0.5 truncate text-base font-bold text-foreground" title={award.name}>
                                                    {award.name}
                                                </h3>
                                            </div>
                                            <Link
                                                href={`/tabulation-results/breakdown/${award.id}`}
                                                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border/80 bg-muted/60 px-2 py-1 text-[10px] font-semibold text-foreground transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400"
                                                title="View computation breakdown"
                                            >
                                                <Calculator className="h-3 w-3" />
                                                <span>Computation &rarr;</span>
                                            </Link>
                                        </div>

                                        <div className="mt-3.5 flex flex-col gap-2">
                                            {award.nominees.length === 0 ? (
                                                <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                                                    No nominees registered in this award category.
                                                </div>
                                            ) : (
                                                award.nominees.map((nominee) => {
                                                    const isLeader =
                                                        nominee.rank === 1 &&
                                                        nominee.votes_count > 0;

                                                    return (
                                                        <div
                                                            key={nominee.id}
                                                            className={`relative rounded-xl border p-2.5 transition-all ${
                                                                isLeader
                                                                    ? 'border-emerald-500/40 bg-emerald-500/[0.03] ring-1 ring-emerald-500/20'
                                                                    : 'border-border/70 bg-card'
                                                            }`}
                                                        >
                                                            <div className="flex items-center justify-between gap-1.5">
                                                                <div className="flex min-w-0 items-center gap-2">
                                                                    <div
                                                                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
                                                                            nominee.rank === 1
                                                                                ? 'bg-emerald-600 text-white shadow-2xs'
                                                                                : 'bg-muted text-muted-foreground'
                                                                        }`}
                                                                    >
                                                                        {nominee.rank === 1 ? (
                                                                            <Crown className="h-3 w-3" />
                                                                        ) : (
                                                                            `#${nominee.rank}`
                                                                        )}
                                                                    </div>

                                                                    <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted shadow-sm">
                                                                        {!nominee.is_masked ? (
                                                                            nominee.photo_path && nominee.photo_path !== '/images/user_unknown.png' ? (
                                                                                <img
                                                                                    src={nominee.photo_path}
                                                                                    alt={nominee.name}
                                                                                    className="h-full w-full object-cover"
                                                                                />
                                                                            ) : (
                                                                                <User className="h-4 w-4 text-muted-foreground/50" />
                                                                            )
                                                                        ) : (
                                                                            <img
                                                                                src="/images/user_unknown.png"
                                                                                alt="Nominee"
                                                                                className="h-full w-full object-cover"
                                                                            />
                                                                        )}
                                                                    </div>

                                                                    <div className="min-w-0">
                                                                        <div className="truncate text-xs font-bold text-foreground" title={nominee.name}>
                                                                            {nominee.name}
                                                                        </div>
                                                                        {!nominee.is_masked && nominee.department ? (
                                                                            <div
                                                                                className="flex items-center gap-1 truncate text-[10px] text-muted-foreground"
                                                                                title={`Designation: ${nominee.department}`}
                                                                            >
                                                                                <Briefcase className="h-2.5 w-2.5 shrink-0 text-primary/70" />
                                                                                <span className="truncate">
                                                                                    {nominee.department}
                                                                                </span>
                                                                            </div>
                                                                        ) : null}
                                                                        {!nominee.is_masked && nominee.organization ? (
                                                                            <div
                                                                                className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-muted-foreground"
                                                                                title={`Area of Assignment: ${nominee.organization}`}
                                                                            >
                                                                                <MapPin className="h-2.5 w-2.5 shrink-0 text-primary/70" />
                                                                                <span className="truncate">
                                                                                    {nominee.organization}
                                                                                </span>
                                                                            </div>
                                                                        ) : null}
                                                                        {nominee.is_masked && (
                                                                            <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                                                                                <Sparkles className="h-2.5 w-2.5 shrink-0" />
                                                                                <span className="truncate">
                                                                                    Pending
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className="shrink-0 text-right">
                                                                    <div className="font-mono text-xs font-black text-foreground">
                                                                        {nominee.final_score}%
                                                                    </div>
                                                                    <div className="text-[10px] text-muted-foreground">
                                                                        DC {nominee.dc_has_voted ? nominee.dc_weighted_score : '0.00'}% | SH {nominee.sh_weighted_score}%
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                                                <div
                                                                    className={`h-full transition-all duration-700 ${
                                                                        isLeader
                                                                            ? 'bg-emerald-600'
                                                                            : 'bg-primary'
                                                                    }`}
                                                                    style={{
                                                                        width: `${Math.min(100, Math.max(0, nominee.final_score_num))}%`,
                                                                    }}
                                                                />
                                                            </div>

                                                            {isLeader && (
                                                                <Link
                                                                    href={`/tabulation-results/breakdown/${award.id}`}
                                                                    className="mt-2 flex items-center justify-between rounded-lg bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-500/20 dark:text-emerald-300"
                                                                    title="View winner computation breakdown"
                                                                >
                                                                    <span className="flex items-center gap-1">
                                                                        <Crown className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                                                        Winner Computation Breakdown
                                                                    </span>
                                                                    <span>&rarr;</span>
                                                                </Link>
                                                            )}
                                                        </div>
                                                    );
                                                })
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
