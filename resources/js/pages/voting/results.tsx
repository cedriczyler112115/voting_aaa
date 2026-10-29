import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    Building2,
    Crown,
    Lock,
    Sparkles,
    Trophy,
    User,
    Users,
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';

type NomineeResult = {
    id: number;
    name: string;
    photo_path: string | null;
    department: string | null;
    organization?: string | null;
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
};

type AwardResult = {
    id: number;
    name: string;
    description: string | null;
    is_hidden: boolean;
    total_votes: number;
    total_points?: number;
    distinct_ballots?: number;
    nominees: NomineeResult[];
};

type Props = {
    event: {
        id: number;
        title: string;
        slug: string;
        description: string | null;
        banner_path: string | null;
        status: string;
        is_closed: boolean;
    };
    awards: AwardResult[];
};

export default function VotingResults({ event, awards }: Props) {
    const breadcrumbs = [
        { title: 'Voting Events', href: '/dashboard' },
        { title: event.title, href: `/voting/${event.slug}` },
        { title: 'Standings & Results', href: `/voting/${event.slug}/results` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Results - ${event.title}`} />

            <div className="voting-container flex w-full flex-1 flex-col gap-8 p-4 sm:p-6 lg:p-8">
                <div>
                    <Link
                        href={`/voting/${event.slug}`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Back to Event Ballot
                    </Link>
                </div>

                {/* Results Header */}
                <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card to-muted/30 p-6 shadow-sm md:p-10 dark:border-neutral-800">
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                            <Trophy className="h-3.5 w-3.5" />
                            Official 50/50 Weighted Voting Matrix
                        </span>
                        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                            Status: {event.status}
                        </span>
                    </div>

                    <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground md:text-4xl">
                        {event.title}
                    </h1>
                    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                        {event.description ||
                            'Official final scores computed via criteria scoring: 50% Division Chief (DC) rating + 50% Section Heads average rating.'}
                    </p>
                </div>

                {/* Awards Results Grid */}
                <div className="flex flex-col gap-10">
                    {awards.map((award, index) => (
                        <div
                            key={award.id}
                            className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8"
                        >
                            <div className="flex flex-col gap-2 border-b border-border/50 pb-5 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                        Category {index + 1}
                                    </div>
                                    <h2 className="mt-0.5 text-xl font-bold tracking-tight text-foreground md:text-2xl">
                                        {award.name}
                                    </h2>
                                    {award.description && (
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {award.description}
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 rounded-xl bg-muted/60 px-4 py-2 text-xs font-medium text-foreground">
                                    <Users className="h-4 w-4 text-primary" />
                                    <span>
                                        Voters Participating:{' '}
                                        <strong className="font-bold">
                                            {award.distinct_ballots ?? award.total_votes}
                                        </strong>
                                    </span>
                                </div>
                            </div>

                            {award.is_hidden ? (
                                <div className="mt-6 flex flex-col items-center justify-center rounded-xl bg-muted/40 p-8 text-center text-sm text-muted-foreground">
                                    <Lock className="mb-2 h-6 w-6 text-muted-foreground" />
                                    <span>
                                        Results for this award are currently
                                        hidden per administrator policy.
                                    </span>
                                </div>
                            ) : award.nominees.length === 0 ? (
                                <div className="mt-6 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                                    No nominees or votes recorded for this
                                    category yet.
                                </div>
                            ) : (
                                <div className="mt-6 flex flex-col gap-4">
                                    {award.nominees.map((nominee) => {
                                        const isWinner =
                                            nominee.rank === 1 &&
                                            (nominee.final_score_num > 0 || nominee.votes_count > 0);

                                        return (
                                            <div
                                                key={nominee.id}
                                                className={`relative overflow-hidden rounded-xl border p-4 transition-all ${
                                                    isWinner
                                                        ? 'border-amber-500/40 bg-amber-500/[0.03] ring-1 ring-amber-500/20'
                                                        : 'border-border/70 bg-card'
                                                }`}
                                            >
                                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                                    <div className="flex items-center gap-3.5">
                                                        {/* Rank badge */}
                                                        <div
                                                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                                                                nominee.rank === 1
                                                                    ? 'bg-amber-500 text-white shadow-sm'
                                                                    : nominee.rank === 2
                                                                      ? 'bg-neutral-300 text-foreground dark:bg-neutral-700'
                                                                      : nominee.rank === 3
                                                                        ? 'bg-amber-700 text-white'
                                                                        : 'bg-muted text-muted-foreground'
                                                            }`}
                                                        >
                                                            {nominee.rank === 1 ? (
                                                                <Crown className="h-5 w-5" />
                                                            ) : (
                                                                `#${nominee.rank}`
                                                            )}
                                                        </div>

                                                        {/* Nominee details */}
                                                        <div className="flex items-center gap-3.5">
                                                            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted shadow-sm">
                                                                {nominee.photo_path ? (
                                                                    <img
                                                                        src={nominee.photo_path}
                                                                        alt={nominee.name}
                                                                        className="h-full w-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <User className="h-8 w-8 text-muted-foreground/50" />
                                                                )}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <h3 className="text-sm font-bold text-foreground md:text-base">
                                                                        {nominee.name}
                                                                    </h3>
                                                                    {isWinner && (
                                                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                                                                            <Sparkles className="h-3 w-3" /> Leading
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {nominee.department && (
                                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                                        <Building2 className="h-3 w-3" />
                                                                        <span>{nominee.department}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* 50/50 Breakdown & Final Score */}
                                                    <div className="flex flex-wrap items-center gap-4 sm:justify-end">
                                                        {/* DC Component */}
                                                        <div className="rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5 text-center text-xs">
                                                            <div className="text-[10px] font-semibold text-muted-foreground">
                                                                DC Score (50%)
                                                            </div>
                                                            <div className="font-bold text-foreground">
                                                                {nominee.dc_has_voted ? (
                                                                    <span>
                                                                        {nominee.dc_score}%{' '}
                                                                        <span className="text-[10px] text-primary">
                                                                            ({nominee.dc_weighted_score}%)
                                                                        </span>
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-muted-foreground italic">
                                                                        Pending
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Section Heads Component */}
                                                        <div className="rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5 text-center text-xs">
                                                            <div className="text-[10px] font-semibold text-muted-foreground">
                                                                SH Average (50%)
                                                            </div>
                                                            <div className="font-bold text-foreground">
                                                                {nominee.sh_count > 0 ? (
                                                                    <span>
                                                                        {nominee.sh_average}%{' '}
                                                                        <span className="text-[10px] text-primary">
                                                                            ({nominee.sh_weighted_score}%)
                                                                        </span>
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-muted-foreground italic">
                                                                        0 votes
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Final Score */}
                                                        <div className="text-right">
                                                            <div className="font-mono text-xl font-black text-foreground">
                                                                {nominee.final_score}%
                                                            </div>
                                                            <div className="text-[11px] font-medium text-muted-foreground">
                                                                Final Weighted Score
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Percentage bar */}
                                                <div className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                                                    <div
                                                        className={`h-full transition-all duration-700 ${
                                                            isWinner
                                                                ? 'bg-amber-500'
                                                                : 'bg-primary'
                                                        }`}
                                                        style={{
                                                            width: `${Math.min(100, Math.max(0, nominee.final_score_num))}%`,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}
