import { Link, usePage } from '@inertiajs/react';
import { ShieldCheck, Vote } from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const { auth } = usePage().props;
    const isAdmin = Boolean(
        auth?.user?.is_admin || auth?.user?.role === 'admin',
    );

    return (
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-border/60 bg-background/90 px-3 backdrop-blur-md transition-all duration-200 md:px-6">
            {/* Left Section: Menubar Sidebar Trigger + Breadcrumbs */}
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <SidebarTrigger
                    className="size-8.5 rounded-lg border border-border/60 bg-card/60 shadow-xs hover:bg-accent"
                    title="Toggle Sidebar"
                />

                <div className="hidden h-5 w-px bg-border/60 sm:block" />

                <div className="min-w-0 flex-1">
                    <Breadcrumbs breadcrumbs={breadcrumbs} />
                </div>
            </div>

            {/* Right Section: Logged in User Name & Role Badge */}
            <div className="flex items-center gap-2 sm:gap-3">
                {auth?.user?.name && (
                    <div className="flex items-center gap-2">
                        <Link
                            href="/settings/profile"
                            className="group flex items-center gap-1.5 transition-colors hover:text-primary"
                            title="Account Profile"
                        >
                            <span className="max-w-[130px] truncate text-xs font-semibold text-foreground group-hover:text-primary sm:max-w-[220px] md:text-sm">
                                {auth.user.name}
                            </span>
                        </Link>
                        <div className="hidden h-4 w-px bg-border/60 sm:block" />
                    </div>
                )}

                {isAdmin ? (
                    <Link
                        href="/admin"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-700 transition-colors hover:bg-amber-500/20 dark:text-amber-400"
                        title="Admin Management Console"
                    >
                        <ShieldCheck className="size-3.5" />
                        <span className="hidden sm:inline">Administrator</span>
                    </Link>
                ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-semibold text-primary">
                        <Vote className="size-3.5" />
                        <span className="hidden sm:inline">Verified Voter</span>
                    </span>
                )}
            </div>
        </header>
    );
}
