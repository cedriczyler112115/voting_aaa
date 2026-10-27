import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    Award,
    BarChart3,
    Clock,
    PlusCircle,
    ShieldCheck,
    Trophy,
    Users,
    Vote,
} from 'lucide-react';
import AppLayout from '@/layouts/app-layout';

type Props = {
    metrics: {
        total_events: number;
        active_events: number;
        total_awards: number;
        total_nominees: number;
        total_votes: number;
        total_voters: number;
        distinct_voters: number;
        turnout_percentage: number;
    };
    recent_events: Array<{
        id: number;
        title: string;
        slug: string;
        status: string;
        starts_at: string | null;
        ends_at: string | null;
        awards_count: number;
        votes_count: number;
    }>;
    recent_logs: Array<{
        id: number;
        action: string;
        description: string;
        user_name: string;
        created_at: string;
    }>;
};

export default function AdminDashboard({
    metrics,
    recent_events,
    recent_logs,
}: Props) {
    const breadcrumbs = [
        { title: 'Administration', href: '/admin' },
        { title: 'Overview & Analytics', href: '/admin' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin Dashboard - Voting Management" />

            <div className="voting-container flex w-full flex-1 flex-col gap-8 p-4 sm:p-6 lg:p-8">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                            Election & Awards Administration
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Oversee dynamic voting events, manage categories and
                            nominees, verify ballot tallies, and audit voter
                            activities.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Link
                            href="/admin/events"
                            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
                        >
                            <PlusCircle className="h-4 w-4" />
                            Create New Event
                        </Link>
                        <Link
                            href="/admin/results"
                            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted"
                        >
                            <BarChart3 className="h-4 w-4" />
                            View Reports
                        </Link>
                    </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-xs font-semibold tracking-wider uppercase">
                                Voting Events
                            </span>
                            <div className="rounded-lg bg-primary/10 p-2 text-primary">
                                <Trophy className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 text-2xl font-extrabold text-foreground">
                            {metrics.total_events}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                {metrics.active_events} active
                            </span>
                            <span>currently open</span>
                        </div>
                    </div>

                    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-xs font-semibold tracking-wider uppercase">
                                Awards & Nominees
                            </span>
                            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600">
                                <Award className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 text-2xl font-extrabold text-foreground">
                            {metrics.total_awards}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                            Across{' '}
                            <strong className="text-foreground">
                                {metrics.total_nominees}
                            </strong>{' '}
                            total nominees
                        </div>
                    </div>

                    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-xs font-semibold tracking-wider uppercase">
                                Total Ballots Cast
                            </span>
                            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
                                <Vote className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 text-2xl font-extrabold text-foreground">
                            {metrics.total_votes}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                            From{' '}
                            <strong className="text-foreground">
                                {metrics.distinct_voters}
                            </strong>{' '}
                            participating voters
                        </div>
                    </div>

                    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                        <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-xs font-semibold tracking-wider uppercase">
                                Voter Participation
                            </span>
                            <div className="rounded-lg bg-purple-500/10 p-2 text-purple-600">
                                <Users className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="mt-3 text-2xl font-extrabold text-foreground">
                            {metrics.turnout_percentage}%
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                            Of{' '}
                            <strong className="text-foreground">
                                {metrics.total_voters}
                            </strong>{' '}
                            registered users
                        </div>
                    </div>
                </div>

                {/* Main Content Split */}
                <div className="grid gap-8 lg:grid-cols-3">
                    {/* Recent Events (2 columns on lg) */}
                    <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:col-span-2">
                        <div>
                            <div className="flex items-center justify-between border-b border-border/70 p-5">
                                <div className="flex items-center gap-2">
                                    <Trophy className="h-4 w-4 text-primary" />
                                    <h2 className="text-base font-bold text-foreground">
                                        Voting Events Overview
                                    </h2>
                                </div>
                                <Link
                                    href="/admin/events"
                                    className="text-xs font-semibold text-primary hover:underline"
                                >
                                    Manage All Events
                                </Link>
                            </div>

                            <div className="divide-y divide-border/60">
                                {recent_events.length === 0 ? (
                                    <div className="p-8 text-center text-sm text-muted-foreground">
                                        No voting events created yet.
                                    </div>
                                ) : (
                                    recent_events.map((event) => (
                                        <div
                                            key={event.id}
                                            className="flex flex-col gap-2 p-5 transition-colors hover:bg-muted/20 sm:flex-row sm:items-center sm:justify-between"
                                        >
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <Link
                                                        href={`/admin/events/${event.id}`}
                                                        className="text-base font-bold text-foreground hover:text-primary hover:underline"
                                                    >
                                                        {event.title}
                                                    </Link>
                                                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground capitalize">
                                                        {event.status}
                                                    </span>
                                                </div>

                                                <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                                                    <span>
                                                        {event.awards_count}{' '}
                                                        Awards
                                                    </span>
                                                    <span>•</span>
                                                    <span>
                                                        {event.votes_count}{' '}
                                                        Votes
                                                    </span>
                                                    {event.ends_at && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="h-3 w-3 text-amber-500" />
                                                                Ends:{' '}
                                                                {event.ends_at}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Link
                                                    href={`/admin/events/${event.id}`}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                                                >
                                                    Edit Awards
                                                    <ArrowRight className="h-3 w-3" />
                                                </Link>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-border/50 bg-muted/20 p-4 text-xs text-muted-foreground">
                            <span>
                                Dynamic event lifecycle: Draft → Scheduled →
                                Published → Closed → Archived
                            </span>
                        </div>
                    </div>

                    {/* Audit Logs Stream (1 column on lg) */}
                    <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                        <div>
                            <div className="flex items-center justify-between border-b border-border/70 p-5">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4 text-primary" />
                                    <h2 className="text-base font-bold text-foreground">
                                        Audit Activity Stream
                                    </h2>
                                </div>
                                <Link
                                    href="/admin/audit-logs"
                                    className="text-xs font-semibold text-primary hover:underline"
                                >
                                    Full Log
                                </Link>
                            </div>

                            <div className="divide-y divide-border/60">
                                {recent_logs.length === 0 ? (
                                    <div className="p-8 text-center text-sm text-muted-foreground">
                                        No recent audit entries.
                                    </div>
                                ) : (
                                    recent_logs.map((log) => (
                                        <div
                                            key={log.id}
                                            className="p-4 transition-colors hover:bg-muted/20"
                                        >
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-mono font-semibold text-primary">
                                                    {log.action}
                                                </span>
                                                <span className="text-muted-foreground">
                                                    {log.created_at}
                                                </span>
                                            </div>
                                            <p className="mt-1 line-clamp-2 text-xs leading-snug text-foreground">
                                                {log.description}
                                            </p>
                                            <div className="mt-1 text-[11px] text-muted-foreground">
                                                By:{' '}
                                                <span className="font-medium">
                                                    {log.user_name}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="border-t border-border/50 bg-muted/20 p-3 text-center">
                            <Link
                                href="/admin/audit-logs"
                                className="text-xs font-semibold text-primary hover:underline"
                            >
                                View Detailed Administrative Audit Trail →
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
