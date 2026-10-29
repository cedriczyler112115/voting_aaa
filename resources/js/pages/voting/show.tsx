import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    Award,
    Building2,
    Check,
    CheckCircle2,
    Crown,
    LoaderCircle,
    Lock,
    Search,
    ShieldAlert,
    Sliders,
    Sparkles,
    Trophy,
    User,
    Users,
    Vote,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
    description: string | null;
    photo_path: string | null;
    department: string | null;
    organization: string | null;
    status: string;
    user_score?: number | null;
    user_criteria_scores?: Record<number, number>;
};

type AwardItem = {
    id: number;
    name: string;
    description: string | null;
    image_path: string | null;
    is_open: boolean;
    allows_vote_changes: boolean;
    has_voted: boolean;
    nominees_count: number;
    user_scores?: Record<
        number,
        { score: number; criteria_scores: Record<number, number> }
    >;
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
    criteria?: CriterionItem[];
    total_criteria_score?: number;
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

    // Track criteria scores: awardId -> nomineeId -> criterionId -> score
    const [awardScores, setAwardScores] = useState<
        Record<number, Record<number, Record<number, number>>>
    >(() => {
        const initial: Record<
            number,
            Record<number, Record<number, number>>
        > = {};
        awards.forEach((award) => {
            initial[award.id] = {};
            award.nominees.forEach((nominee) => {
                const existing = nominee.user_criteria_scores || {};
                initial[award.id][nominee.id] = { ...existing };
            });
        });
        return initial;
    });

    // Synchronize awardScores when props reload from database
    useEffect(() => {
        const initial: Record<
            number,
            Record<number, Record<number, number>>
        > = {};
        awards.forEach((award) => {
            initial[award.id] = {};
            award.nominees.forEach((nominee) => {
                const existing = nominee.user_criteria_scores || {};
                initial[award.id][nominee.id] = { ...existing };
            });
        });
        setAwardScores(initial);
    }, [awards]);

    // State for individual nominee criteria scoring modal
    const [scoringModal, setScoringModal] = useState<{
        award: AwardItem;
        nominee: NomineeItem;
    } | null>(null);
    const [modalCriterionScores, setModalCriterionScores] = useState<
        Record<number, string>
    >({});
    const [savingNominee, setSavingNominee] = useState(false);

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

    const criteriaList = event.criteria || [];
    const totalMaxScore = event.total_criteria_score || 100;

    // Open criteria scoring modal for a specific nominee
    const handleOpenScoringModal = (award: AwardItem, nominee: NomineeItem) => {
        const existing = awardScores[award.id]?.[nominee.id] || {};
        const initial: Record<number, string> = {};
        criteriaList.forEach((c) => {
            initial[c.id] =
                existing[c.id] !== undefined && existing[c.id] !== null
                    ? String(existing[c.id])
                    : '';
        });
        setModalCriterionScores(initial);
        setScoringModal({ award, nominee });
    };

    // Save scores from the modal directly to database
    const handleSaveModalScores = () => {
        if (!scoringModal || savingNominee) return;
        const { award, nominee } = scoringModal;
        const cleaned: Record<number, number> = {};

        criteriaList.forEach((c) => {
            const raw = modalCriterionScores[c.id];
            let val = parseFloat(raw || '0');
            if (isNaN(val) || val < 0) val = 0;
            if (val > c.max_score) val = c.max_score;
            cleaned[c.id] = val;
        });

        setSavingNominee(true);
        router.post(
            '/voting/save-nominee-score',
            {
                voting_award_id: award.id,
                voting_nominee_id: nominee.id,
                scores: cleaned,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setAwardScores((prev) => ({
                        ...prev,
                        [award.id]: {
                            ...prev[award.id],
                            [nominee.id]: cleaned,
                        },
                    }));
                    setScoringModal(null);
                },
                onFinish: () => {
                    setSavingNominee(false);
                },
            },
        );
    };

    // Calculate total score for a nominee in an award
    const getNomineeTotal = (awardId: number, nomineeId: number): number => {
        const nomineeCriteria = awardScores[awardId]?.[nomineeId] || {};
        return Object.values(nomineeCriteria).reduce(
            (sum, val) => sum + (Number(val) || 0),
            0,
        );
    };

    // Check if nominee has scores recorded for all criteria
    const isNomineeComplete = (
        awardId: number,
        nomineeId: number,
    ): boolean => {
        if (criteriaList.length === 0) return false;
        const nomineeCriteria = awardScores[awardId]?.[nomineeId];
        if (!nomineeCriteria || Object.keys(nomineeCriteria).length === 0) return false;
        return criteriaList.every(
            (c) =>
                nomineeCriteria[c.id] !== undefined &&
                nomineeCriteria[c.id] !== null &&
                !isNaN(nomineeCriteria[c.id]),
        );
    };

    // Group unscored nominees by award for warning notification badges
    const unscoredNomineesByAward = useMemo(() => {
        const map: Record<number, NomineeItem[]> = {};
        awards.forEach((award) => {
            const active = award.nominees.filter((n) => n.status === 'active');
            map[award.id] = active.filter((n) => !isNomineeComplete(award.id, n.id));
        });
        return map;
    }, [awards, awardScores, criteriaList]);

    // Total count of unscored nominees across all active awards
    const totalUnscoredCount = useMemo(() => {
        return Object.values(unscoredNomineesByAward).reduce(
            (sum, list) => sum + list.length,
            0,
        );
    }, [unscoredNomineesByAward]);

    const totalActiveNomineesCount = useMemo(() => {
        return awards.reduce(
            (sum, a) => sum + a.nominees.filter((n) => n.status === 'active').length,
            0,
        );
    }, [awards]);

    // Check if an award category is completely scored
    const isAwardComplete = (award: AwardItem): boolean => {
        const activeNominees = award.nominees.filter((n) => n.status === 'active');
        if (activeNominees.length === 0 || criteriaList.length === 0) return false;
        return activeNominees.every((nominee) =>
            isNomineeComplete(award.id, nominee.id),
        );
    };

    // Check if voter changed any scores from previously saved ones
    const hasAwardChanges = (award: AwardItem): boolean => {
        if (!award.has_voted) return true;
        const currentAward = awardScores[award.id] || {};
        for (const nominee of award.nominees) {
            const currentNominee = currentAward[nominee.id] || {};
            const initialNominee = nominee.user_criteria_scores || {};
            for (const criterion of criteriaList) {
                const cVal = currentNominee[criterion.id] ?? 0;
                const iVal = initialNominee[criterion.id] ?? 0;
                if (cVal !== iVal) return true;
            }
        }
        return false;
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
                            <div className="flex flex-wrap items-center gap-2">
                                <span
                                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                                        event.is_open
                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                            : event.is_closed
                                              ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                    }`}
                                >
                                    <span
                                        className={`h-2 w-2 rounded-full ${
                                            event.is_open
                                                ? 'bg-emerald-500'
                                                : event.is_closed
                                                  ? 'bg-red-500'
                                                  : 'bg-amber-500'
                                        }`}
                                    />
                                    {event.status.toUpperCase()}
                                </span>

                                <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-semibold text-primary">
                                    <Sliders className="h-3.5 w-3.5" />
                                    Criteria Scoring Matrix (100%)
                                </span>

                                {event.allow_vote_changes && (
                                    <span className="text-xs text-muted-foreground">
                                        • Vote changes permitted before closing
                                    </span>
                                )}
                            </div>

                            <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                                {event.title}
                            </h1>
                            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                                {event.description ||
                                    'Score nominees across the evaluation criteria. Final scores are weighted 50% from the Division Chief and 50% from Section Heads.'}
                            </p>
                        </div>

                        {/* Event Stats Counter */}
                        <div className="flex items-center gap-4 rounded-xl border border-border/80 bg-muted/40 p-4">
                            <div className="text-center">
                                <div className="text-2xl font-black text-foreground">
                                    {event.completed_awards} / {event.total_awards}
                                </div>
                                <div className="text-[11px] font-semibold text-muted-foreground uppercase">
                                    Awards Evaluated
                                </div>
                            </div>
                            <div className="h-8 w-px bg-border/80" />
                            <div className="text-center">
                                <div className="text-2xl font-black text-primary">
                                    {criteriaList.length}
                                </div>
                                <div className="text-[11px] font-semibold text-muted-foreground uppercase">
                                    Criteria Total
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Flash Messages */}
                {flash?.success && (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-semibold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span>{flash.success}</span>
                    </div>
                )}
                {flash?.error && (
                    <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-semibold text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                        <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                        <span>{flash.error}</span>
                    </div>
                )}

                {/* Overall Warning Banner If Nominees Do Not Have Score */}
                {event.is_open && event.is_eligible && totalUnscoredCount > 0 && (
                    <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-amber-500/30 dark:bg-amber-500/10">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                            <div>
                                <h4 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                                    Notification Warning: {totalUnscoredCount} nominee{totalUnscoredCount === 1 ? '' : 's'} without score!
                                </h4>
                                <p className="mt-0.5 text-xs text-amber-900/80 dark:text-amber-300/80">
                                    Scores are saved directly to the database as you score each nominee. Please ensure every nominee is scored to complete your evaluation.
                                </p>
                            </div>
                        </div>
                        <div className="shrink-0 self-start sm:self-center">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/20 px-3 py-1 font-mono text-xs font-bold text-amber-950 dark:text-amber-200">
                                <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                {totalActiveNomineesCount - totalUnscoredCount} of {totalActiveNomineesCount} Nominees Scored
                            </span>
                        </div>
                    </div>
                )}

                {/* Eligibility Notice */}
                {!event.is_eligible && (
                    <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm">
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
                        const activeNominees = award.nominees.filter(
                            (n) => n.status === 'active',
                        );
                        const unscoredInThisAward = unscoredNomineesByAward[award.id] || [];
                        const isComplete = activeNominees.length > 0 && unscoredInThisAward.length === 0;

                        const canChange =
                            event.is_eligible &&
                            event.is_open &&
                            award.is_open &&
                            (!isVoted || award.allows_vote_changes);

                        return (
                            <section
                                key={award.id}
                                className={`rounded-2xl border p-6 transition-all md:p-8 ${
                                    isComplete
                                        ? 'border-emerald-500/30 bg-emerald-500/[0.02] dark:border-emerald-500/20'
                                        : 'border-border bg-card'
                                }`}
                            >
                                {/* Award Category Header */}
                                <div className="flex flex-col gap-4 border-b border-border/50 pb-5 md:flex-row md:items-center md:justify-between">
                                    <div className="flex items-start gap-3">
                                        <div
                                            className={`mt-0.5 rounded-lg p-2.5 ${
                                                isComplete
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
                                                {isComplete ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                        <Check className="h-3 w-3" /> All Nominees Scored
                                                    </span>
                                                ) : isVoted ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                                                        <AlertCircle className="h-3 w-3" /> Partially Scored
                                                    </span>
                                                ) : null}
                                                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                                    {activeNominees.length} Nominees
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

                                    {/* Category Status Indicator */}
                                    {event.is_open && award.is_open && (
                                        <div className="flex flex-wrap items-center gap-2">
                                            {isComplete ? (
                                                <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                                    <CheckCircle2 className="h-4 w-4" />
                                                    Category Complete
                                                </div>
                                            ) : (
                                                <div className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                                                    <AlertCircle className="h-4 w-4" />
                                                    {unscoredInThisAward.length} Nominee{unscoredInThisAward.length === 1 ? '' : 's'} Unscored
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Nominees Grid in 5 Columns */}
                                <div className="mt-6">
                                    {activeNominees.length === 0 ? (
                                        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                                            No active nominees registered for this award category yet.
                                        </div>
                                    ) : (
                                        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                                            {activeNominees.map((nominee) => {
                                                const isScored = isNomineeComplete(award.id, nominee.id);
                                                const nomineeTotal = getNomineeTotal(award.id, nominee.id);
                                                const nomineePercentage =
                                                    totalMaxScore > 0
                                                        ? Math.round((nomineeTotal / totalMaxScore) * 10000) / 100
                                                        : 0;
                                                const nomineeCriteriaScores =
                                                    awardScores[award.id]?.[nominee.id] || {};

                                                return (
                                                    <div
                                                        key={nominee.id}
                                                        className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border transition-all ${
                                                            isScored
                                                                ? 'border-emerald-500/60 bg-emerald-500/[0.02] shadow-sm ring-1 ring-emerald-500/20'
                                                                : 'border-amber-500/50 bg-amber-500/[0.02] hover:border-amber-500 hover:shadow-md'
                                                        }`}
                                                    >
                                                        <div>
                                                            {/* Large Nominee Photo (Aspect 4/3) */}
                                                            <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                                                                {nominee.photo_path ? (
                                                                    <img
                                                                        src={nominee.photo_path}
                                                                        alt={nominee.name}
                                                                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                                    />
                                                                ) : (
                                                                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted/50 to-muted text-muted-foreground/40">
                                                                        <User className="h-14 w-14" />
                                                                    </div>
                                                                )}

                                                                {/* Prominent Score Badge on Photo */}
                                                                <div className="absolute top-2.5 right-2.5">
                                                                    {isScored ? (
                                                                        <div className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-600/90 px-2 py-0.5 text-[11px] font-black text-white shadow-md backdrop-blur-md">
                                                                            <CheckCircle2 className="h-3 w-3" />
                                                                            <span>{nomineeTotal} pts</span>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="inline-flex items-center gap-1 rounded-full border border-amber-500/60 bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs backdrop-blur-md">
                                                                            <AlertCircle className="h-3 w-3" />
                                                                            <span>Not Scored</span>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Department Pill */}
                                                                {nominee.department && (
                                                                    <div className="absolute bottom-2 left-2 inline-flex max-w-[85%] items-center gap-1 truncate rounded-md bg-background/90 px-1.5 py-0.5 text-[10px] font-semibold text-foreground shadow-xs backdrop-blur-sm">
                                                                        <Building2 className="h-2.5 w-2.5 shrink-0 text-primary" />
                                                                        <span className="truncate">{nominee.department}</span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Card Body */}
                                                            <div className="p-3.5">
                                                                <h3 className="text-sm leading-snug font-bold text-foreground line-clamp-1" title={nominee.name}>
                                                                    {nominee.name}
                                                                </h3>
                                                                {nominee.organization && (
                                                                    <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                                                                        <Users className="h-3 w-3 shrink-0" />
                                                                        <span className="truncate">{nominee.organization}</span>
                                                                    </div>
                                                                )}

                                                                {/* Final Nominee Score Box */}
                                                                <div className={`mt-2.5 rounded-xl border p-2 text-center transition-colors ${
                                                                    isScored
                                                                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200'
                                                                        : 'border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-200'
                                                                }`}>
                                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                                        Final Nominee Score
                                                                    </div>
                                                                    <div className="font-mono text-sm font-black text-foreground">
                                                                        {isScored ? (
                                                                            <span>
                                                                                {nomineeTotal}{' '}
                                                                                <span className="text-xs font-semibold text-muted-foreground">/ {totalMaxScore}</span>{' '}
                                                                                <span className="text-emerald-600 dark:text-emerald-400">({nomineePercentage.toFixed(1)}%)</span>
                                                                            </span>
                                                                        ) : (
                                                                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                                                                                <AlertCircle className="h-3.5 w-3.5 text-amber-500" /> Pending Score
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Detailed Criteria Scores Breakdown */}
                                                                <div className="mt-2.5 rounded-xl border border-border/50 bg-background/60 p-2">
                                                                    <div className="mb-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                                                        Criteria Scores
                                                                    </div>
                                                                    {isScored ? (
                                                                        <div className="flex flex-col gap-1">
                                                                            {criteriaList.map((crit) => {
                                                                                const s = nomineeCriteriaScores[crit.id] ?? 0;
                                                                                return (
                                                                                    <div key={crit.id} className="flex items-center justify-between text-[10px]">
                                                                                        <span className="truncate text-muted-foreground" title={crit.name}>
                                                                                            {crit.name}
                                                                                        </span>
                                                                                        <span className="shrink-0 font-mono font-bold text-foreground">
                                                                                            {s}/{crit.max_score}
                                                                                        </span>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="py-1 text-center text-[10px] text-amber-700 dark:text-amber-300 italic">
                                                                            No criteria scores saved yet
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Card Footer: Button for Criteria Score */}
                                                        <div className="border-t border-border/60 bg-muted/20 p-3">
                                                            <button
                                                                type="button"
                                                                disabled={!canChange}
                                                                onClick={() => handleOpenScoringModal(award, nominee)}
                                                                className={`w-full inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold shadow-2xs transition-colors ${
                                                                    isScored
                                                                        ? 'border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20'
                                                                        : 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50'
                                                                }`}
                                                            >
                                                                <Sliders className="h-3.5 w-3.5" />
                                                                {isScored ? 'Edit Criteria Scores' : 'Score Criteria'}
                                                            </button>
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

            {/* Individual Nominee Criteria Scoring Modal */}
            {scoringModal && (
                <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200 fade-in">
                    <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl">
                        {/* Header */}
                        <div className="flex items-start justify-between border-b border-border/60 pb-4">
                            <div className="flex items-center gap-3.5">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
                                    {scoringModal.nominee.photo_path ? (
                                        <img
                                            src={scoringModal.nominee.photo_path}
                                            alt={scoringModal.nominee.name}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <User className="h-6 w-6 text-muted-foreground/60" />
                                    )}
                                </div>
                                <div>
                                    <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                        Criteria Rating • {scoringModal.award.name}
                                    </div>
                                    <h3 className="text-lg font-bold text-foreground">
                                        {scoringModal.nominee.name}
                                    </h3>
                                    {scoringModal.nominee.department && (
                                        <div className="text-xs text-muted-foreground">
                                            {scoringModal.nominee.department}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setScoringModal(null)}
                                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Criteria Inputs */}
                        <div className="mt-4 flex flex-col gap-3">
                            <p className="text-xs text-muted-foreground">
                                Rate this nominee for each criterion from 0 up to its maximum score. When saved, the score is saved directly to the database.
                            </p>

                            {criteriaList.map((criterion, idx) => {
                                const currentVal = modalCriterionScores[criterion.id] ?? '';
                                const numVal = parseFloat(currentVal || '0') || 0;
                                const isOver = numVal > criterion.max_score;

                                return (
                                    <div
                                        key={criterion.id}
                                        className={`flex flex-col gap-2 rounded-xl border p-3.5 sm:flex-row sm:items-center sm:justify-between ${
                                            isOver
                                                ? 'border-red-500/50 bg-red-500/5'
                                                : 'border-border/70 bg-background/50'
                                        }`}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                                                    {idx + 1}
                                                </span>
                                                <span className="text-xs font-bold text-foreground">
                                                    {criterion.name}
                                                </span>
                                            </div>
                                            {criterion.description && (
                                                <p className="mt-1 pl-7 text-[11px] text-muted-foreground">
                                                    {criterion.description}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 pl-7 sm:pl-0">
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={criterion.max_score}
                                                    step={0.5}
                                                    placeholder="0"
                                                    value={currentVal}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setModalCriterionScores((prev) => ({
                                                            ...prev,
                                                            [criterion.id]: val,
                                                        }));
                                                    }}
                                                    className={`w-24 rounded-lg border bg-card px-2.5 py-1.5 text-center text-sm font-bold text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none ${
                                                        isOver
                                                            ? 'border-red-500 text-red-600'
                                                            : 'border-border focus:border-primary'
                                                    }`}
                                                />
                                            </div>
                                            <span className="text-xs font-bold text-muted-foreground shrink-0">
                                                / {criterion.max_score} pts
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Modal Live Summary */}
                        {(() => {
                            const total = criteriaList.reduce((sum, c) => {
                                const raw = modalCriterionScores[c.id];
                                const v = parseFloat(raw || '0');
                                return sum + (isNaN(v) ? 0 : v);
                            }, 0);
                            const pct =
                                totalMaxScore > 0
                                    ? Math.round((total / totalMaxScore) * 10000) / 100
                                    : 0;
                            const hasErrors = criteriaList.some((c) => {
                                const v = parseFloat(modalCriterionScores[c.id] || '0');
                                return v < 0 || v > c.max_score;
                            });

                            return (
                                <div className="mt-5 rounded-xl border border-primary/20 bg-primary/[0.03] p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-[11px] font-semibold text-muted-foreground uppercase">
                                                Computed Nominee Score
                                            </div>
                                            <div className="font-mono text-xl font-black text-foreground">
                                                {total.toFixed(1)}{' '}
                                                <span className="text-xs font-semibold text-muted-foreground">
                                                    / {totalMaxScore} pts
                                                </span>
                                            </div>
                                        </div>
                                        <div className="rounded-lg bg-emerald-500/10 px-3 py-1.5 font-mono text-base font-black text-emerald-600 dark:text-emerald-400">
                                            {pct.toFixed(1)}%
                                        </div>
                                    </div>

                                    {hasErrors && (
                                        <p className="mt-2 text-xs font-semibold text-red-500">
                                            Some scores exceed the maximum allowed for that criterion.
                                        </p>
                                    )}

                                    <div className="mt-5 flex items-center justify-end gap-3 border-t border-border/60 pt-4">
                                        <button
                                            type="button"
                                            disabled={savingNominee}
                                            onClick={() => setScoringModal(null)}
                                            className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            disabled={hasErrors || savingNominee}
                                            onClick={handleSaveModalScores}
                                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
                                        >
                                            {savingNominee ? (
                                                <>
                                                    <LoaderCircle className="h-4 w-4 animate-spin" />
                                                    Saving to Database...
                                                </>
                                            ) : (
                                                <>
                                                    <Check className="h-4 w-4" />
                                                    Save Nominee Score
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
