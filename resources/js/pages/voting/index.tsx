import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Award,
    Calendar,
    CheckCircle2,
    Clock,
    Lock,
    ShieldAlert,
    Users,
    Vote,
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';

type EventItem = {
    id: number;
    title: string;
    slug: string;
    description: string | null;
    banner_path: string | null;
    starts_at: string | null;
    ends_at: string | null;
    starts_at_formatted?: string | null;
    ends_at_formatted?: string | null;
    status: 'draft' | 'scheduled' | 'published' | 'closed' | 'archived';
    is_open: boolean;
    is_upcoming: boolean;
    is_closed: boolean;
    can_view_results: boolean;
    allow_vote_changes: boolean;
    total_awards: number;
    voted_awards_count: number;
    staff_voted_count: number;
    authorized_voters_count: number;
    turnout_percentage: number;
    progress_percentage: number;
    is_eligible: boolean;
};

function formatScheduleDateTime(dateString: string | null | undefined, formattedString?: string | null): string {
    if (formattedString) {
        return formattedString;
    }
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return dateString;
        }
        const datePart = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
        const timePart = date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
        return `${datePart} at ${timePart}`;
    } catch {
        return dateString;
    }
}

type Props = {
    events: EventItem[];
};

export default function VotingIndex({ events }: Props) {
    const { flash } = usePage<{
        flash?: { success?: string; error?: string };
    }>().props;

    const breadcrumbs = [{ title: 'Voting Events', href: '/dashboard' }];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Available Voting Events" />

            <div className="voting-container flex w-full flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
                {/* Flash Messages */}
                {flash?.error && (
                    <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-medium text-red-800 dark:text-red-300">
                        <ShieldAlert className="h-5 w-5 shrink-0 text-red-600" />
                        <span>{flash.error}</span>
                    </div>
                )}
                {flash?.success && (
                    <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-800 dark:text-emerald-300">
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                        <span>{flash.success}</span>
                    </div>
                )}

                {/* Header */}
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                        Awards & Election Voting
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Exercise your vote in recognized institutional awards,
                        organizational honors, and peer elections. Every ballot
                        is cryptographically and transactionally secured.
                    </p>
                </div>

                {/* Events Grid */}
                {events.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border p-12 text-center">
                        <div className="rounded-full bg-muted p-4 text-muted-foreground">
                            <Vote className="h-8 w-8" />
                        </div>
                        <h3 className="mt-4 text-lg font-semibold">
                            No Active Voting Events
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            There are currently no published voting events
                            scheduled for your profile. Please check back later.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                        {events.map((event) => {
                            const isFullyVoted =
                                event.total_awards > 0 &&
                                event.voted_awards_count === event.total_awards;

                            return (
                                <div
                                    key={event.id}
                                    className="group flex flex-col justify-between rounded-xl border border-border/80 bg-card p-6 shadow-sm transition-all hover:shadow-md dark:border-neutral-800"
                                >
                                    <div>
                                        {/* Status Badges */}
                                        <div className="flex items-center justify-between gap-2">
                                            {event.is_open ? (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                                                    Voting Open
                                                </span>
                                            ) : event.is_upcoming ? (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                                                    <Clock className="h-3 w-3" />
                                                    Scheduled
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-600 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-400">
                                                    <Lock className="h-3 w-3" />
                                                    Closed
                                                </span>
                                            )}
                                        </div>

                                        {/* Title & Description */}
                                        <h2 className="mt-4 text-xl font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
                                            {event.title}
                                        </h2>
                                        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                                            {event.description ||
                                                'Cast your votes for the nominated candidates and categories.'}
                                        </p>

                                        {/* Notification: Not Allowed to Vote */}
                                        {!event.is_eligible && (
                                            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/15 dark:text-red-300">
                                                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                                                <div>
                                                    <p className="font-bold text-red-800 dark:text-red-200">
                                                        You are not allowed to
                                                        vote
                                                    </p>
                                                    <p className="mt-0.5 text-[11px] leading-relaxed text-red-700/90 dark:text-red-300/90">
                                                        Your account is not
                                                        registered on the
                                                        authorized voter list
                                                        for this event. You
                                                        cannot access or submit
                                                        ballots.
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Schedule Info */}
                                        <div className="mt-4 flex flex-col gap-1.5 text-xs text-muted-foreground">
                                            {event.starts_at && (
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-3.5 w-3.5 shrink-0 text-primary" />
                                                    <span>
                                                        Opens:{' '}
                                                        <span className="font-medium text-foreground">
                                                            {formatScheduleDateTime(
                                                                event.starts_at,
                                                                event.starts_at_formatted,
                                                            )}
                                                        </span>
                                                    </span>
                                                </div>
                                            )}
                                            {event.ends_at && (
                                                <div className="flex items-center gap-2">
                                                    <Clock className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                                                    <span>
                                                        Closes:{' '}
                                                        <span className="font-medium text-foreground">
                                                            {formatScheduleDateTime(
                                                                event.ends_at,
                                                                event.ends_at_formatted,
                                                            )}
                                                        </span>
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Turnout Progress Bar */}
                                        <div className="mt-5 rounded-lg bg-muted/60 p-3">
                                            <div className="flex items-center justify-between text-xs font-medium">
                                                <span className="flex items-center gap-1.5 text-foreground">
                                                    <Users className="h-3.5 w-3.5 text-primary" />
                                                    Staff Voted:
                                                </span>
                                                <span className="font-semibold text-foreground">
                                                    {event.staff_voted_count} / {event.authorized_voters_count}
                                                    <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                                                        ({event.turnout_percentage}%)
                                                    </span>
                                                </span>
                                            </div>
                                            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                                                <div
                                                    className={`h-full transition-all duration-500 ${
                                                        event.turnout_percentage === 100
                                                            ? 'bg-emerald-500'
                                                            : 'bg-primary'
                                                    }`}
                                                    style={{
                                                        width: `${event.turnout_percentage}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="mt-6 flex items-center justify-between gap-3 border-t border-border/50 pt-4">
                                        {event.can_view_results ? (
                                            <Link
                                                href={`/tabulation-results?event_id=${event.id}`}
                                                className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
                                            >
                                                View Official Results
                                            </Link>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">
                                                {event.allow_vote_changes
                                                    ? 'Vote changes allowed'
                                                    : 'Votes are final'}
                                            </span>
                                        )}

                                        {event.is_eligible && (
                                            <Link
                                                href={`/voting/${event.slug}`}
                                                className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition-colors ${
                                                    isFullyVoted
                                                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                                                }`}
                                            >
                                                {isFullyVoted ? (
                                                    <>
                                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                                        Review Ballot
                                                    </>
                                                ) : (
                                                    <>
                                                        Open Ballot
                                                        <ArrowRight className="h-3.5 w-3.5" />
                                                    </>
                                                )}
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
