import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    Award,
    Building2,
    Check,
    CheckCircle2,
    Crown,
    Lock,
    RotateCcw,
    Search,
    ShieldAlert,
    Sparkles,
    Trophy,
    User,
    Users,
    Vote,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';

type NomineeItem = {
    id: number;
    name: string;
    description: string | null;
    photo_path: string | null;
    department: string | null;
    organization: string | null;
    status: string;
    user_rank: number | null;
};

type AwardItem = {
    id: number;
    name: string;
    description: string | null;
    image_path: string | null;
    is_open: boolean;
    allows_vote_changes: boolean;
    has_voted: boolean;
    max_rank: number;
    user_rankings: Record<number, number>;
    nominees: NomineeItem[];
};

type EventDetail = {
    id: number;
    title: string;
    slug: string;
    description: string | null;
    banner_path: string | null;
    starts_at: string | null;
    ends_at: string | null;
    status: string;
    is_open: boolean;
    is_closed: boolean;
    can_view_results: boolean;
    allow_vote_changes: boolean;
    is_eligible: boolean;
    total_awards: number;
    completed_awards: number;
    progress_percentage: number;
    total_authorized_voters?: number;
    staff_voted_count?: number;
};

type UnvotedVoter = {
    id: number;
    name: string;
    email?: string | null;
    department?: string | null;
};

type Props = {
    event: EventDetail;
    awards: AwardItem[];
    unvoted_voters?: UnvotedVoter[];
};

function formatVoterName(name: string): string {
    if (!name) return '';
    return name
        .toLowerCase()
        .split(' ')
        .map((part) => {
            if (/^(ii|iii|iv|v|vi|vii|viii|jr\.?|sr\.?)$/i.test(part)) {
                return part.toUpperCase();
            }
            return part.charAt(0).toUpperCase() + part.slice(1);
        })
        .join(' ');
}

export default function VotingShow({
    event,
    awards,
    unvoted_voters = [],
}: Props) {
    const [voterSearch, setVoterSearch] = useState('');
    const { flash } = usePage<{
        flash?: { success?: string; error?: string };
    }>().props;

    // Track rankings per award: awardId -> { nomineeId: rank }
    const [awardRankings, setAwardRankings] = useState<
        Record<number, Record<number, number>>
    >(() => {
        const initial: Record<number, Record<number, number>> = {};
        awards.forEach((award) => {
            initial[award.id] = { ...award.user_rankings };
        });
        return initial;
    });

    const [modalAward, setModalAward] = useState<AwardItem | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const filteredUnvotedVoters = useMemo(() => {
        const query = voterSearch.trim().toLowerCase();
        if (!query) return unvoted_voters;
        return unvoted_voters.filter(
            (v) =>
                v.name.toLowerCase().includes(query) ||
                (v.email && v.email.toLowerCase().includes(query)) ||
                (v.department && v.department.toLowerCase().includes(query)),
        );
    }, [unvoted_voters, voterSearch]);

    // Generate rank choices from maxRank down to 1 (e.g. 5, 4, 3, 2, 1)
    const getRankOptions = (maxRank: number) => {
        const options: number[] = [];
        for (let r = maxRank; r >= 1; r--) {
            options.push(r);
        }
        return options;
    };

    // Assign rank with auto-swap conflict resolution
    const handleSetRank = (
        award: AwardItem,
        nomineeId: number,
        targetRank: number | null,
    ) => {
        if (!event.is_open || !award.is_open) return;
        if (award.has_voted && !award.allows_vote_changes) return;

        setAwardRankings((prev) => {
            const currentAwardRanks = { ...prev[award.id] };

            if (targetRank === null) {
                delete currentAwardRanks[nomineeId];
                return { ...prev, [award.id]: currentAwardRanks };
            }

            // Find if another nominee in this award already holds this target rank
            const otherNomineeEntry = Object.entries(currentAwardRanks).find(
                ([id, rank]) => Number(id) !== nomineeId && rank === targetRank,
            );

            const oldRankOfCurrent = currentAwardRanks[nomineeId];

            // Assign target rank to current nominee
            currentAwardRanks[nomineeId] = targetRank;

            // Auto-swap: give the previous occupant the current nominee's old rank, or unrank if none
            if (otherNomineeEntry) {
                const otherNomineeId = Number(otherNomineeEntry[0]);
                if (oldRankOfCurrent) {
                    currentAwardRanks[otherNomineeId] = oldRankOfCurrent;
                } else {
                    delete currentAwardRanks[otherNomineeId];
                }
            }

            return { ...prev, [award.id]: currentAwardRanks };
        });
    };

    const handleClearAwardRankings = (award: AwardItem) => {
        if (!event.is_open || !award.is_open) return;
        if (award.has_voted && !award.allows_vote_changes) return;

        setAwardRankings((prev) => ({
            ...prev,
            [award.id]: {},
        }));
    };

    const handleOpenConfirm = (award: AwardItem) => {
        setModalAward(award);
    };

    const handleConfirmVote = () => {
        if (!modalAward) return;

        const rankings = awardRankings[modalAward.id] ?? {};
        setSubmitting(true);

        router.post(
            '/voting/vote',
            {
                voting_award_id: modalAward.id,
                rankings: rankings,
            },
            {
                preserveScroll: true,
                onFinish: () => {
                    setSubmitting(false);
                    setModalAward(null);
                },
            },
        );
    };

    const breadcrumbs = [
        { title: 'Voting Events', href: '/dashboard' },
        { title: event.title, href: `/voting/${event.slug}` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={event.title} />

            <div className="voting-container flex w-full flex-1 flex-col gap-8 p-4 sm:p-6 lg:p-8">
                {/* Back Link */}
                <div>
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Back to All Voting Events
                    </Link>
                </div>

                {/* Event Header Banner */}
                <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm md:p-8 dark:border-neutral-800">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                {event.is_open ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                                        Voting Open
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-500/10 px-2.5 py-0.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                                        <Lock className="h-3 w-3" />
                                        {event.status}
                                    </span>
                                )}
                                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                                    <Trophy className="h-3 w-3" />
                                    Ranking Style Voting
                                </span>
                            </div>

                            <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                                {event.title}
                            </h1>
                            {event.description && (
                                <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                                    {event.description}
                                </p>
                            )}
                        </div>

                        {/* Progress card */}
                        <div className="flex min-w-[200px] shrink-0 flex-col rounded-xl border border-border/60 bg-muted/40 p-4">
                            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                                <span>Ballot Progress</span>
                                <span className="font-bold text-foreground">
                                    {event.completed_awards} /{' '}
                                    {event.total_awards} Awards
                                </span>
                            </div>
                            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                    className="h-full bg-primary transition-all duration-300"
                                    style={{
                                        width: `${event.progress_percentage}%`,
                                    }}
                                />
                            </div>
                            {event.can_view_results && (
                                <Link
                                    href={`/voting/${event.slug}/results`}
                                    className="mt-3 text-center text-xs font-semibold text-primary hover:underline"
                                >
                                    View Official Results
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Authorized Voters Not Yet Voted */}
                    <div className="mt-6 border-t border-border/60 pt-5">
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                        <Users className="h-3.5 w-3.5" />
                                    </div>
                                    <span className="text-xs font-semibold text-foreground sm:text-sm">
                                        Authorized to Vote <span className="font-normal text-muted-foreground">(Not Yet Voted)</span>:
                                    </span>
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                        {unvoted_voters.length} pending
                                    </span>
                                </div>

                                {unvoted_voters.length > 6 && (
                                    <div className="relative w-full max-w-xs sm:w-60">
                                        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                        <input
                                            type="text"
                                            placeholder="Search pending voter..."
                                            value={voterSearch}
                                            onChange={(e) =>
                                                setVoterSearch(e.target.value)
                                            }
                                            className="h-7 w-full rounded-lg border border-border/70 bg-background/80 pl-8 pr-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden"
                                        />
                                    </div>
                                )}
                            </div>

                            {unvoted_voters.length === 0 ? (
                                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                    <span className="font-semibold">
                                        All authorized voters have cast their votes!
                                    </span>
                                </div>
                            ) : (
                                <div className="flex max-h-40 flex-wrap items-center gap-2 overflow-y-auto rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                                    {filteredUnvotedVoters.length === 0 ? (
                                        <div className="py-1 text-xs text-amber-700/80 dark:text-amber-400/80">
                                            No pending voter matching "{voterSearch}"
                                        </div>
                                    ) : (
                                        filteredUnvotedVoters.map((voter) => (
                                            <span
                                                key={voter.id}
                                                className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-900 shadow-2xs transition-colors hover:border-amber-500/40 hover:bg-amber-500/20 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-200"
                                                title={
                                                    voter.department
                                                        ? `${formatVoterName(voter.name)} (${voter.department})`
                                                        : formatVoterName(voter.name)
                                                }
                                            >
                                                <User className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />
                                                <span>{formatVoterName(voter.name)}</span>
                                            </span>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Notifications & Flash Messages */}
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
                {!event.is_eligible && (
                    <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-medium text-red-800 dark:border-red-500/20 dark:bg-red-500/15 dark:text-red-300">
                        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                        <div>
                            <p className="font-bold text-red-800 dark:text-red-200">
                                You are not allowed to vote in this event
                            </p>
                            <p className="mt-0.5 text-xs text-red-700/90 dark:text-red-300/90">
                                Your account is not registered on the authorized
                                voter list for this event. Voting selections and
                                submissions are restricted.
                            </p>
                        </div>
                    </div>
                )}

                {/* Awards List */}
                <div className="flex flex-col gap-10">
                    {awards.map((award, index) => {
                        const isVoted = award.has_voted;
                        const currentRanks = awardRankings[award.id] ?? {};
                        const rankedCount = Object.keys(currentRanks).length;
                        const maxRank = award.max_rank;
                        const rankOptions = getRankOptions(maxRank);
                        const isComplete =
                            rankedCount === maxRank &&
                            maxRank > 0 &&
                            new Set(Object.values(currentRanks)).size ===
                            maxRank;

                        // Check if current rankings differ from recorded user_rankings
                        const hasChanges = (() => {
                            const initial = award.user_rankings ?? {};
                            if (
                                Object.keys(currentRanks).length !==
                                Object.keys(initial).length
                            )
                                return true;
                            return Object.entries(currentRanks).some(
                                ([id, r]) => initial[Number(id)] !== r,
                            );
                        })();

                        const canChange =
                            event.is_eligible &&
                            event.is_open &&
                            award.is_open &&
                            (!isVoted || award.allows_vote_changes);

                        return (
                            <section
                                key={award.id}
                                className={`rounded-2xl border p-6 transition-all md:p-8 ${isVoted
                                        ? 'border-emerald-500/30 bg-emerald-500/[0.02] dark:border-emerald-500/20'
                                        : 'border-border bg-card'
                                    }`}
                            >
                                {/* Award Category Header */}
                                <div className="flex flex-col gap-4 border-b border-border/50 pb-5 md:flex-row md:items-center md:justify-between">
                                    <div className="flex items-start gap-3">
                                        <div
                                            className={`mt-0.5 rounded-lg p-2.5 ${isVoted
                                                    ? 'bg-emerald-500/10 text-emerald-600'
                                                    : 'bg-primary/10 text-primary'
                                                }`}
                                        >
                                            <Award className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                                    Category {index + 1}
                                                </span>
                                                {isVoted && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                        <Check className="h-3 w-3" />{' '}
                                                        Rankings Recorded
                                                    </span>
                                                )}
                                                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                                    {maxRank} Nominees (Ranks{' '}
                                                    {maxRank} down to 1)
                                                </span>
                                            </div>
                                            <h2 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
                                                {award.name}
                                            </h2>
                                            {award.description && (
                                                <p className="mt-1 text-sm text-muted-foreground">
                                                    {award.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action button & status in award header */}
                                    {event.is_open && award.is_open && (
                                        <div className="flex flex-wrap items-center gap-3">
                                            {/* Reset button if changes made */}
                                            {canChange && rankedCount > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleClearAwardRankings(
                                                            award,
                                                        )
                                                    }
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                    title="Clear All Rankings for this category"
                                                >
                                                    <RotateCcw className="h-3.5 w-3.5" />
                                                    Reset
                                                </button>
                                            )}

                                            {isVoted &&
                                                !award.allows_vote_changes ? (
                                                <div className="flex items-center gap-1.5 rounded-lg bg-muted/60 px-3.5 py-2 text-xs font-medium text-muted-foreground">
                                                    <Lock className="h-3.5 w-3.5" />
                                                    Rankings Finalized
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleOpenConfirm(award)
                                                    }
                                                    disabled={
                                                        !isComplete ||
                                                        (!hasChanges && isVoted)
                                                    }
                                                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold shadow-xs transition-all ${!isComplete ||
                                                            (!hasChanges && isVoted)
                                                            ? 'cursor-not-allowed bg-muted text-muted-foreground'
                                                            : 'bg-primary text-primary-foreground hover:bg-primary/90'
                                                        }`}
                                                >
                                                    <Vote className="h-4 w-4" />
                                                    {isVoted
                                                        ? hasChanges
                                                            ? 'Update My Rankings'
                                                            : 'Rankings Recorded'
                                                        : isComplete
                                                            ? 'Submit Rankings'
                                                            : `Rank All (${rankedCount}/${maxRank})`}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Ranking Instructions Bar */}
                                <div className="mt-4 flex flex-col gap-2 rounded-xl border border-primary/15 bg-primary/[0.03] p-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-2 text-xs text-foreground">
                                        <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
                                        <span>
                                            Assign a rank to each nominee from{' '}
                                            <strong>{maxRank}</strong> (highest
                                            choice / {maxRank} pts) down to{' '}
                                            <strong>1</strong> (lowest choice /
                                            1 pt).
                                        </span>
                                    </div>
                                    <div className="text-xs font-semibold">
                                        {isComplete ? (
                                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                                <CheckCircle2 className="h-3.5 w-3.5" />{' '}
                                                All Nominees Ranked
                                            </span>
                                        ) : (
                                            <span className="text-amber-600 dark:text-amber-400">
                                                {rankedCount} of {maxRank}{' '}
                                                Nominees Ranked
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Nominees Grid */}
                                <div className="mt-6">
                                    {award.nominees.length === 0 ? (
                                        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                                            No nominees registered for this
                                            award yet.
                                        </div>
                                    ) : (
                                        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                                            {award.nominees.map((nominee) => {
                                                const assignedRank =
                                                    currentRanks[nominee.id] ??
                                                    null;
                                                const isRanked =
                                                    assignedRank !== null;
                                                const isTopChoice =
                                                    assignedRank === maxRank;

                                                return (
                                                    <div
                                                        key={nominee.id}
                                                        className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border transition-all ${isTopChoice
                                                                ? 'border-amber-500/80 bg-amber-500/[0.04] shadow-md ring-2 ring-amber-500/20'
                                                                : isRanked
                                                                    ? 'border-primary bg-primary/[0.02] shadow-sm ring-1 ring-primary/20'
                                                                    : 'border-border/70 bg-card hover:border-border hover:shadow-md'
                                                            }`}
                                                    >
                                                        <div>
                                                            {/* Large Nominee Photo */}
                                                            <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                                                                {nominee.photo_path ? (
                                                                    <img
                                                                        src={
                                                                            nominee.photo_path
                                                                        }
                                                                        alt={
                                                                            nominee.name
                                                                        }
                                                                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                                    />
                                                                ) : (
                                                                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted/50 to-muted text-muted-foreground/40">
                                                                        <User className="h-16 w-16" />
                                                                    </div>
                                                                )}

                                                                {/* Prominent Rank Badge on Photo */}
                                                                <div className="absolute top-3 right-3">
                                                                    {isRanked ? (
                                                                        <div
                                                                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold shadow-md backdrop-blur-md ${isTopChoice
                                                                                    ? 'border border-amber-300 bg-amber-500 text-amber-950'
                                                                                    : assignedRank ===
                                                                                        maxRank -
                                                                                        1
                                                                                        ? 'border border-emerald-300 bg-emerald-500 text-emerald-950'
                                                                                        : 'border border-border/80 bg-background/90 text-foreground'
                                                                                }`}
                                                                        >
                                                                            {isTopChoice && (
                                                                                <Crown className="h-3.5 w-3.5 text-amber-950" />
                                                                            )}
                                                                            <span>
                                                                                Rank{' '}
                                                                                {
                                                                                    assignedRank
                                                                                }
                                                                            </span>
                                                                            <span className="text-[10px] font-normal opacity-75">
                                                                                (
                                                                                {
                                                                                    assignedRank
                                                                                }{' '}
                                                                                pts)
                                                                            </span>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="rounded-full border border-border/80 bg-background/80 px-2 py-0.5 text-[11px] font-medium text-muted-foreground shadow-xs backdrop-blur-md">
                                                                            Unranked
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Department Pill */}
                                                                {nominee.department && (
                                                                    <div className="absolute bottom-2.5 left-2.5 inline-flex max-w-[85%] items-center gap-1 truncate rounded-md bg-background/90 px-2 py-0.5 text-[11px] font-semibold text-foreground shadow-sm backdrop-blur-sm">
                                                                        <Building2 className="h-3 w-3 shrink-0 text-primary" />
                                                                        <span className="truncate">{nominee.department}</span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Card Body */}
                                                            <div className="p-4">
                                                                <h3 className="text-base leading-snug font-bold text-foreground">
                                                                    {
                                                                        nominee.name
                                                                    }
                                                                </h3>
                                                                {nominee.department && (
                                                                    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                                                                        <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                                                                        <span className="truncate">
                                                                            {nominee.department}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                {nominee.organization && (
                                                                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                                                                        <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                                                                        <span className="truncate">
                                                                            {nominee.organization}
                                                                        </span>
                                                                    </div>
                                                                )}

                                                                {/* Biography */}
                                                                {nominee.description && (
                                                                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                                                                        {
                                                                            nominee.description
                                                                        }
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Interactive Rank Selector */}
                                                        <div className="border-t border-border/60 bg-muted/20 p-3.5">
                                                            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-muted-foreground">
                                                                <span>
                                                                    Assign Rank:
                                                                </span>
                                                                {isRanked &&
                                                                    canChange && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={(
                                                                                e,
                                                                            ) => {
                                                                                e.stopPropagation();
                                                                                handleSetRank(
                                                                                    award,
                                                                                    nominee.id,
                                                                                    null,
                                                                                );
                                                                            }}
                                                                            className="text-[11px] text-muted-foreground hover:text-red-500 hover:underline"
                                                                        >
                                                                            Clear
                                                                        </button>
                                                                    )}
                                                            </div>

                                                            {/* Quick Rank Button Row */}
                                                            <div className="flex items-center gap-1.5">
                                                                {rankOptions.map(
                                                                    (r) => {
                                                                        const isCurrentButtonRank =
                                                                            assignedRank ===
                                                                            r;
                                                                        const isRankTakenInAward =
                                                                            Object.values(
                                                                                currentRanks,
                                                                            ).includes(
                                                                                r,
                                                                            );
                                                                        const isRankTakenByOther =
                                                                            isRankTakenInAward &&
                                                                            !isCurrentButtonRank;
                                                                        const isAvailable =
                                                                            canChange &&
                                                                            !isRankTakenInAward;
                                                                        const isDisabled =
                                                                            !canChange ||
                                                                            isRankTakenInAward;

                                                                        return (
                                                                            <button
                                                                                key={
                                                                                    r
                                                                                }
                                                                                type="button"
                                                                                disabled={
                                                                                    isDisabled
                                                                                }
                                                                                onClick={() =>
                                                                                    handleSetRank(
                                                                                        award,
                                                                                        nominee.id,
                                                                                        r,
                                                                                    )
                                                                                }
                                                                                className={`flex flex-1 min-w-0 flex-col items-center justify-center rounded-lg px-1 py-1.5 text-xs font-bold transition-all ${
                                                                                    isCurrentButtonRank
                                                                                        ? r ===
                                                                                          maxRank
                                                                                            ? 'bg-amber-500 text-amber-950 shadow-sm ring-2 ring-amber-400 font-extrabold cursor-default'
                                                                                            : 'bg-blue-700 text-white shadow-sm ring-2 ring-blue-400 font-extrabold cursor-default dark:bg-blue-600'
                                                                                        : isAvailable
                                                                                          ? 'cursor-pointer border border-blue-500/40 bg-blue-600 text-white shadow-xs hover:scale-[1.02] hover:bg-blue-500 active:bg-blue-700'
                                                                                          : 'cursor-not-allowed border border-neutral-200/80 bg-neutral-100 text-neutral-400 opacity-40 dark:border-neutral-700/60 dark:bg-neutral-800/60 dark:text-neutral-500'
                                                                                }`}
                                                                                title={
                                                                                    isCurrentButtonRank
                                                                                        ? `Rank ${r} selected for this nominee`
                                                                                        : isRankTakenByOther
                                                                                          ? `Rank ${r} is already selected by another nominee`
                                                                                          : isAvailable
                                                                                            ? `Assign Rank ${r} (${r === maxRank ? 'Highest Choice' : `${r} pts`})`
                                                                                            : `Rank ${r} unavailable`
                                                                                }
                                                                            >
                                                                                <span className="flex items-center gap-0.5">
                                                                                    {isCurrentButtonRank &&
                                                                                        r ===
                                                                                            maxRank && (
                                                                                            <Crown className="h-2.5 w-2.5 text-amber-950" />
                                                                                        )}
                                                                                    {
                                                                                        r
                                                                                    }
                                                                                </span>
                                                                                <span className="text-[9px] font-normal opacity-85">
                                                                                    {r ===
                                                                                    maxRank
                                                                                        ? 'Top'
                                                                                        : `${r}p`}
                                                                                </span>
                                                                            </button>
                                                                        );
                                                                    },
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </section>
                        );
                    })}
                </div>
            </div>

            {/* Confirmation Modal */}
            {modalAward && (
                <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200 fade-in">
                    <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
                        <div className="flex items-center gap-3">
                            <div className="rounded-full bg-primary/10 p-3 text-primary">
                                <Trophy className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-foreground">
                                    Confirm Your Rankings
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Please review your ranked nominees before
                                    final submission
                                </p>
                            </div>
                        </div>

                        <div className="mt-5 rounded-xl border border-border/60 bg-muted/40 p-4">
                            <div className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                                Award Category
                            </div>
                            <div className="mt-0.5 text-base font-bold text-foreground">
                                {modalAward.name}
                            </div>

                            {/* Ranked Nominees List ordered from maxRank down to 1 */}
                            <div className="mt-4 flex flex-col gap-2.5 border-t border-border/60 pt-3.5">
                                {(() => {
                                    const currentRanks =
                                        awardRankings[modalAward.id] ?? {};
                                    const sortedList = [
                                        ...modalAward.nominees,
                                    ].sort((a, b) => {
                                        const rA = currentRanks[a.id] ?? 0;
                                        const rB = currentRanks[b.id] ?? 0;
                                        return rB - rA; // Descending: 5, 4, 3, 2, 1
                                    });

                                    return sortedList.map((nominee) => {
                                        const r = currentRanks[nominee.id] ?? 0;
                                        const isTop = r === modalAward.max_rank;

                                        return (
                                            <div
                                                key={nominee.id}
                                                className={`flex items-center justify-between rounded-xl border p-2.5 text-xs ${isTop
                                                        ? 'border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200'
                                                        : 'border-border/60 bg-card text-foreground'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span
                                                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-bold ${isTop
                                                                ? 'bg-amber-500 text-amber-950'
                                                                : 'bg-muted text-foreground'
                                                            }`}
                                                    >
                                                        {r}
                                                    </span>
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
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
                                                            <User className="h-5 w-5 text-muted-foreground/60" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold">
                                                            {nominee.name}
                                                        </div>
                                                        {nominee.department && (
                                                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                                                <Building2 className="h-3 w-3 shrink-0" />
                                                                <span>{nominee.department}</span>
                                                            </div>
                                                        )}
                                                        {nominee.organization && (
                                                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                                                <Users className="h-3 w-3 shrink-0" />
                                                                <span>{nominee.organization}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    <span className="text-xs font-extrabold">
                                                        {r} pts
                                                    </span>
                                                    {isTop && (
                                                        <div className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                                            Top Choice
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>

                        {!modalAward.allows_vote_changes && (
                            <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>
                                    Vote changing is disabled for this award.
                                    Once submitted, your rankings are final and
                                    cannot be modified.
                                </span>
                            </div>
                        )}

                        <div className="mt-6 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setModalAward(null)}
                                disabled={submitting}
                                className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmVote}
                                disabled={submitting}
                                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                            >
                                {submitting
                                    ? 'Submitting Rankings...'
                                    : 'Confirm & Submit Rankings'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
