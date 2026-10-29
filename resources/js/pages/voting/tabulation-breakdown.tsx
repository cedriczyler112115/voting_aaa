import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    Award,
    Briefcase,
    Building2,
    Calculator,
    CheckCircle2,
    Crown,
    HelpCircle,
    Info,
    MapPin,
    Shield,
    Sparkles,
    Trophy,
    User,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';

type CriterionItem = {
    id: number;
    name: string;
    description: string | null;
    max_score: number;
    display_order: number;
};

type NomineeItem = {
    id: number;
    name: string;
    photo_path: string | null;
    department: string | null;
    organization: string | null;
    status: string;
    dc_score: number;
    dc_score_formatted: string;
    dc_weighted_score: number;
    dc_weighted_score_formatted: string;
    dc_has_voted: boolean;
    sh_count: number;
    sh_total: number;
    sh_total_formatted: string;
    sh_average: number;
    sh_average_formatted: string;
    sh_weighted_score: number;
    sh_weighted_score_formatted: string;
    final_score: number;
    final_score_formatted: string;
    rank: number;
    is_winner: boolean;
    is_tied?: boolean;
    is_masked?: boolean;
};

type SectionHeadVoter = {
    voter_id: number;
    display_number: number;
    name: string;
    email?: string | null;
    department?: string | null;
    scores: Record<
        number,
        {
            has_voted: boolean;
            score: number | null;
            criteria_scores: Record<number, number>;
        }
    >;
};

type DivisionChiefData = {
    id: number;
    name: string;
    department: string;
    scores: Record<
        number,
        {
            has_voted: boolean;
            score: number | null;
            weighted_score: number;
            criteria_scores: Record<number, number>;
        }
    >;
};

type Props = {
    event: {
        id: number;
        title: string;
        slug: string;
        status: string;
        reveal_date?: string | null;
        is_closed: boolean;
    };
    award: {
        id: number;
        name: string;
        description: string | null;
        status: string;
        nominees_count: number;
        total_votes: number;
    };
    criteria: CriterionItem[];
    total_criteria_score: number;
    nominees: NomineeItem[];
    division_chief: DivisionChiefData;
    section_heads: SectionHeadVoter[];
    section_heads_summary: Record<
        number,
        {
            total_score: string;
            voters_count: number;
            average_score: string;
            weighted_score: string;
        }
    >;
    can_reveal: boolean;
    is_reveal_date_reached: boolean;
};

export default function TabulationBreakdown({
    event,
    award,
    criteria,
    total_criteria_score,
    nominees,
    division_chief,
    section_heads,
    section_heads_summary,
    can_reveal,
}: Props) {
    const [showCriteriaBreakdown, setShowCriteriaBreakdown] = useState(false);

    const winners = nominees.filter((n) => n.rank === 1);
    const hasWinner = winners.length > 0;
    const isTie = winners.length > 1;

    const breadcrumbs = [
        { title: 'Voting Events', href: '/dashboard' },
        { title: 'Tabulation Result', href: `/tabulation-results?event_id=${event.id}` },
        { title: `${award.name} Computation`, href: `/tabulation-results/breakdown/${award.id}` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${award.name} - Computation Breakdown (${event.title})`} />

            <div className="voting-container flex w-full flex-1 flex-col gap-8 p-4 sm:p-6 lg:p-8">
                {/* Back Button and Navigation */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Link
                        href={`/tabulation-results?event_id=${event.id}`}
                        className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-2xs transition-colors hover:bg-muted"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Tabulation Results
                    </Link>

                    <div className="flex items-center gap-2">
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                            {event.title}
                        </span>
                        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            {award.name}
                        </span>
                    </div>
                </div>

                {/* Winner Spotlight Card */}
                {hasWinner && (
                    <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.08] via-card to-card p-6 shadow-md dark:border-emerald-500/25 md:p-8">
                        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                                {/* Winner Photo */}
                                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-2 border-emerald-500/40 bg-muted shadow-md">
                                    {winners[0].photo_path && winners[0].photo_path !== '/images/user_unknown.png' ? (
                                        <img
                                            src={winners[0].photo_path}
                                            alt={winners[0].name}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground/40">
                                            <User className="h-12 w-12" />
                                        </div>
                                    )}
                                    <div className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                                        <Crown className="h-3.5 w-3.5" />
                                    </div>
                                </div>

                                <div>
                                    <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600/15 px-2.5 py-0.5 text-xs font-black tracking-wider text-emerald-700 uppercase dark:text-emerald-300">
                                        <Trophy className="h-3.5 w-3.5" />
                                        {isTie ? `Category Co-Winner (Tie)` : 'Official Category Winner'}
                                    </div>
                                    <h1 className="mt-1 text-2xl font-black tracking-tight text-foreground md:text-3xl">
                                        {winners.map((w) => w.name).join(' & ')}
                                    </h1>
                                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                        {winners[0].department && (
                                            <span className="inline-flex items-center gap-1">
                                                <Briefcase className="h-3.5 w-3.5 text-primary" />
                                                {winners[0].department}
                                            </span>
                                        )}
                                        {winners[0].organization && (
                                            <span className="inline-flex items-center gap-1">
                                                <MapPin className="h-3.5 w-3.5 text-primary" />
                                                {winners[0].organization}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Final Score Pill & Formula Box */}
                            <div className="flex flex-col gap-2 sm:items-end">
                                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-center sm:text-right">
                                    <div className="text-[10px] font-bold tracking-wider text-emerald-700 uppercase dark:text-emerald-300">
                                        Final Composite Score
                                    </div>
                                    <div className="font-mono text-3xl font-black text-emerald-600 dark:text-emerald-400">
                                        {winners[0].final_score_formatted}%
                                    </div>
                                </div>
                                <div className="text-[11px] font-semibold text-muted-foreground text-center sm:text-right">
                                    50% Division Chief ({winners[0].dc_weighted_score_formatted}%) + 50% Section Heads ({winners[0].sh_weighted_score_formatted}%)
                                </div>
                            </div>
                        </div>

                        {/* Step-by-Step Math Breakdown for the Winner */}
                        <div className="mt-6 rounded-2xl border border-border/80 bg-background/80 p-4 shadow-2xs backdrop-blur-sm">
                            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                                <Calculator className="h-4 w-4 text-primary" />
                                <span>Computation Formula & Step-by-Step Resolution:</span>
                            </div>
                            <div className="mt-3 grid gap-3 sm:grid-cols-3 text-xs">
                                <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                                    <div className="font-bold text-muted-foreground uppercase text-[10px]">
                                        Step 1: Division Chief Score (50%)
                                    </div>
                                    <div className="mt-1 font-mono text-base font-extrabold text-foreground">
                                        {winners[0].dc_score_formatted} × 50% = <span className="text-primary">{winners[0].dc_weighted_score_formatted}%</span>
                                    </div>
                                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                                        Raw DC rating out of 100 multiplied by 0.50
                                    </p>
                                </div>

                                <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                                    <div className="font-bold text-muted-foreground uppercase text-[10px]">
                                        Step 2: Section Heads' Average (50%)
                                    </div>
                                    <div className="mt-1 font-mono text-base font-extrabold text-foreground">
                                        {winners[0].sh_average_formatted} × 50% = <span className="text-primary">{winners[0].sh_weighted_score_formatted}%</span>
                                    </div>
                                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                                        ({winners[0].sh_total_formatted} total ÷ {winners[0].sh_count} Section Heads) × 0.50
                                    </p>
                                </div>

                                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                                    <div className="font-bold text-emerald-800 dark:text-emerald-300 uppercase text-[10px]">
                                        Step 3: Final Composite Score
                                    </div>
                                    <div className="mt-1 font-mono text-base font-black text-emerald-600 dark:text-emerald-400">
                                        {winners[0].dc_weighted_score_formatted} + {winners[0].sh_weighted_score_formatted} = <span>{winners[0].final_score_formatted}%</span>
                                    </div>
                                    <p className="mt-0.5 text-[11px] text-emerald-800/80 dark:text-emerald-300/80">
                                        Sum of the two 50% weighted components
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Section 1: Final Ranking & Computation Summary Table */}
                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                    <div className="flex flex-col gap-2 border-b border-border/60 bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                        <div className="flex items-center gap-2.5">
                            <div className="rounded-lg bg-primary/10 p-2 text-primary">
                                <Trophy className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-foreground sm:text-lg">
                                    Final Ranking & Computation Summary
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    Composite ranking calculated from 50% Division Chief and 50% Section Heads average
                                </p>
                            </div>
                        </div>

                        <span className="text-xs font-semibold text-muted-foreground">
                            {nominees.length} {nominees.length === 1 ? 'Nominee' : 'Nominees'} Evaluated
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-foreground">
                            <thead className="border-b border-border/60 bg-muted/50 font-semibold text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3 text-center">Rank</th>
                                    <th className="px-4 py-3">Nominee</th>
                                    <th className="px-4 py-3 text-right">DC Raw Score</th>
                                    <th className="px-4 py-3 text-right">DC Weighted (50%)</th>
                                    <th className="px-4 py-3 text-right">SH Average Score</th>
                                    <th className="px-4 py-3 text-right">SH Weighted (50%)</th>
                                    <th className="px-4 py-3 text-right font-black text-foreground">Final Score</th>
                                    <th className="px-4 py-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {nominees.map((nominee) => {
                                    const isWin = nominee.rank === 1;

                                    return (
                                        <tr
                                            key={nominee.id}
                                            className={`transition-colors ${
                                                isWin
                                                    ? 'bg-emerald-500/[0.04] font-semibold hover:bg-emerald-500/[0.08]'
                                                    : 'hover:bg-muted/30'
                                            }`}
                                        >
                                            <td className="px-4 py-3.5 text-center">
                                                {isWin ? (
                                                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white shadow-2xs">
                                                        <Crown className="h-3.5 w-3.5" />
                                                    </span>
                                                ) : (
                                                    <span className="font-mono font-bold text-muted-foreground">
                                                        #{nominee.rank}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-border bg-muted shadow-2xs">
                                                        {nominee.photo_path && nominee.photo_path !== '/images/user_unknown.png' ? (
                                                            <img
                                                                src={nominee.photo_path}
                                                                alt={nominee.name}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <User className="h-4 w-4 text-muted-foreground/50 m-auto mt-2" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-foreground">
                                                            {nominee.name}
                                                        </div>
                                                        {nominee.department && (
                                                            <div className="text-[11px] text-muted-foreground truncate">
                                                                {nominee.department}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 text-right font-mono">
                                                {nominee.dc_has_voted ? `${nominee.dc_score_formatted} pts` : <span className="text-muted-foreground italic">Pending</span>}
                                            </td>
                                            <td className="px-4 py-3.5 text-right font-mono font-bold text-primary">
                                                {nominee.dc_has_voted ? `${nominee.dc_weighted_score_formatted}%` : '0.00%'}
                                            </td>
                                            <td className="px-4 py-3.5 text-right font-mono">
                                                {nominee.sh_count > 0 ? (
                                                    <span>
                                                        {nominee.sh_average_formatted} pts{' '}
                                                        <span className="text-[10px] text-muted-foreground">({nominee.sh_count} voters)</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground italic">No votes</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5 text-right font-mono font-bold text-primary">
                                                {nominee.sh_weighted_score_formatted}%
                                            </td>
                                            <td className="px-4 py-3.5 text-right font-mono text-sm font-black">
                                                <span className={isWin ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}>
                                                    {nominee.final_score_formatted}%
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-center">
                                                {isWin ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-black text-white shadow-2xs">
                                                        <Crown className="h-3 w-3" /> Winner
                                                    </span>
                                                ) : (
                                                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                                        Rank {nominee.rank}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Section 2: Individual Scores per Section Head Matrix (Matching Table 2 of Sample Matrix) */}
                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                    <div className="flex flex-col gap-2 border-b border-border/60 bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                        <div className="flex items-center gap-2.5">
                            <div className="rounded-lg bg-primary/10 p-2 text-primary">
                                <Users className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-foreground sm:text-lg">
                                    Individual Scores per Section Head
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    Detailed scoring grid from all participating Section Heads across all nominees
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setShowCriteriaBreakdown((prev) => !prev)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                            >
                                <Info className="h-3.5 w-3.5 text-primary" />
                                {showCriteriaBreakdown ? 'Hide Criteria Sub-Scores' : 'View Criteria Sub-Scores'}
                            </button>
                        </div>
                    </div>

                    {section_heads.length === 0 ? (
                        <div className="p-8 text-center text-xs text-muted-foreground">
                            No Section Head votes have been recorded for this award yet.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-foreground">
                                <thead className="border-b border-border/60 bg-muted/50 font-semibold text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3">Voter Name</th>
                                        {nominees.map((nominee) => (
                                            <th key={nominee.id} className="px-4 py-3 text-center min-w-[140px]">
                                                <div className="font-bold text-foreground">{nominee.name}</div>
                                                {nominee.department && (
                                                    <div className="text-[10px] font-normal text-muted-foreground truncate">
                                                        {nominee.department}
                                                    </div>
                                                )}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40">
                                    {section_heads.map((sh) => (
                                        <tr key={sh.voter_id} className="hover:bg-muted/30">
                                            <td className="px-4 py-3">
                                                <div className="font-bold text-foreground">
                                                    {sh.name}
                                                </div>
                                                {sh.department && (
                                                    <div className="text-[10px] text-muted-foreground">
                                                        {sh.department}
                                                    </div>
                                                )}
                                            </td>

                                            {nominees.map((nominee) => {
                                                const voteData = sh.scores[nominee.id];
                                                const hasScore = voteData && voteData.score !== null;

                                                return (
                                                    <td key={nominee.id} className="px-4 py-3 text-center font-mono">
                                                        {hasScore ? (
                                                            <div>
                                                                <span className="font-bold text-foreground">
                                                                    {voteData.score} pts
                                                                </span>
                                                                {showCriteriaBreakdown && (
                                                                    <div className="mt-1 flex flex-col gap-0.5 text-[9px] text-muted-foreground text-left bg-muted/40 p-1.5 rounded-md">
                                                                        {criteria.map((crit) => (
                                                                            <div key={crit.id} className="flex justify-between">
                                                                                <span className="truncate pr-1">{crit.name}:</span>
                                                                                <span className="font-bold text-foreground">
                                                                                    {voteData.criteria_scores[crit.id] ?? 0}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground italic text-[11px]">-</span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>

                                {/* Summary Rows: Total, Average, Weighted */}
                                <tfoot className="border-t-2 border-border/80 bg-muted/40 font-mono">
                                    {/* Total Score Row */}
                                    <tr className="border-b border-border/40 font-bold">
                                        <td className="px-4 py-2.5 text-xs text-foreground uppercase tracking-wider">
                                            Total Score
                                        </td>
                                        {nominees.map((nominee) => (
                                            <td key={nominee.id} className="px-4 py-2.5 text-center text-xs font-black text-foreground">
                                                {section_heads_summary[nominee.id]?.total_score ?? '0.00'}
                                            </td>
                                        ))}
                                    </tr>

                                    {/* Average Score Row */}
                                    <tr className="border-b border-border/40 font-bold">
                                        <td className="px-4 py-2.5 text-xs text-foreground uppercase tracking-wider">
                                            Average Score
                                        </td>
                                        {nominees.map((nominee) => (
                                            <td key={nominee.id} className="px-4 py-2.5 text-center text-xs font-extrabold text-primary">
                                                {section_heads_summary[nominee.id]?.average_score ?? '0.00'}
                                            </td>
                                        ))}
                                    </tr>

                                    {/* Weighted Score (50%) Row */}
                                    <tr className="bg-primary/5 font-black text-primary">
                                        <td className="px-4 py-3 text-xs uppercase tracking-wider">
                                            Weighted Score (50%)
                                        </td>
                                        {nominees.map((nominee) => (
                                            <td key={nominee.id} className="px-4 py-3 text-center text-sm">
                                                {section_heads_summary[nominee.id]?.weighted_score ?? '0.00'}%
                                            </td>
                                        ))}
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}

                    <div className="border-t border-border/60 bg-muted/20 p-3.5 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">Formula:</span> Average Score = Total of Section Heads' Scores ÷ Number of Section Heads. Weighted Score = Average Score × 50%.
                    </div>
                </div>

                {/* Section 3: Division Chief (User ID = 2) Score Breakdown (Matching Section 3 of Sample Matrix) */}
                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                    <div className="flex flex-col gap-2 border-b border-border/60 bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                        <div className="flex items-center gap-2.5">
                            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
                                <Shield className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-foreground sm:text-lg">
                                    Division Chief (DC) Scores Breakdown
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    Official ratings submitted by the Division Chief (User ID: 2 - {division_chief.name})
                                </p>
                            </div>
                        </div>

                        <span className="rounded-full bg-emerald-500/10 px-3 py-1 font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300">
                            50% Weight Share
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-foreground">
                            <thead className="border-b border-border/60 bg-muted/50 font-semibold text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3">Nominee</th>
                                    {criteria.map((crit) => (
                                        <th key={crit.id} className="px-4 py-3 text-right">
                                            <div>{crit.name}</div>
                                            <span className="text-[10px] text-muted-foreground font-normal">
                                                Max {crit.max_score} pts
                                            </span>
                                        </th>
                                    ))}
                                    <th className="px-4 py-3 text-right font-bold text-foreground">DC Total Score</th>
                                    <th className="px-4 py-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                                        DC Weighted (50%)
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {nominees.map((nominee) => {
                                    const dcData = division_chief.scores[nominee.id];
                                    const hasVoted = dcData && dcData.has_voted;

                                    return (
                                        <tr key={nominee.id} className="hover:bg-muted/30">
                                            <td className="px-4 py-3.5">
                                                <div className="font-bold text-foreground">{nominee.name}</div>
                                                {nominee.department && (
                                                    <div className="text-[11px] text-muted-foreground">
                                                        {nominee.department}
                                                    </div>
                                                )}
                                            </td>

                                            {criteria.map((crit) => {
                                                const score = dcData?.criteria_scores[crit.id];

                                                return (
                                                    <td key={crit.id} className="px-4 py-3.5 text-right font-mono">
                                                        {hasVoted && score !== undefined ? (
                                                            `${score} pts`
                                                        ) : (
                                                            <span className="text-muted-foreground italic">-</span>
                                                        )}
                                                    </td>
                                                );
                                            })}

                                            <td className="px-4 py-3.5 text-right font-mono text-xs font-bold text-foreground">
                                                {hasVoted ? `${dcData.score} pts` : <span className="text-muted-foreground italic">Pending</span>}
                                            </td>

                                            <td className="px-4 py-3.5 text-right font-mono text-sm font-black text-emerald-600 dark:text-emerald-400">
                                                {hasVoted ? `${dcData.weighted_score.toFixed(2)}%` : '0.00%'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="border-t border-border/60 bg-muted/20 p-3.5 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">Formula:</span> DC Weighted Score = DC Total Score × 50%.
                    </div>
                </div>

                {/* Section 4: Evaluation Criteria Reference Rubric */}
                <div className="rounded-2xl border border-primary/20 bg-primary/[0.02] p-5">
                    <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                        <Info className="h-4 w-4 text-primary" />
                        <span>Evaluation Rubric Criteria Matrix ({total_criteria_score}% Total):</span>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5 text-xs">
                        {criteria.map((crit, idx) => (
                            <div key={crit.id} className="flex flex-col justify-between rounded-xl border border-border/70 bg-card p-3 shadow-2xs">
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                                            {idx + 1}
                                        </span>
                                        <span className="font-bold text-foreground">{crit.name}</span>
                                    </div>
                                    {crit.description && (
                                        <p className="mt-1 text-[11px] text-muted-foreground">
                                            {crit.description}
                                        </p>
                                    )}
                                </div>
                                <div className="mt-2 pt-2 border-t border-border/50 font-mono font-black text-right text-primary">
                                    Max {crit.max_score} pts
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
