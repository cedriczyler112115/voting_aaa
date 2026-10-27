import { Link } from '@inertiajs/react';
import { ChevronRight, Vote } from 'lucide-react';
import { Fragment } from 'react';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function Breadcrumbs({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    if (!breadcrumbs || breadcrumbs.length === 0) {
        return null;
    }

    return (
        <Breadcrumb className="overflow-hidden">
            <BreadcrumbList className="flex items-center text-xs font-medium sm:gap-1.5 sm:text-sm">
                {/* Home / Voting Portal Root */}
                <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                        <Link
                            href="/dashboard"
                            className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            title="4Ps AAA Voting Home"
                        >
                            <Vote className="size-3.5 text-amber-500 dark:text-amber-400" />
                            <span className="hidden sm:inline">Portal</span>
                        </Link>
                    </BreadcrumbLink>
                </BreadcrumbItem>

                <BreadcrumbSeparator>
                    <ChevronRight className="size-3 text-muted-foreground/60" />
                </BreadcrumbSeparator>

                {breadcrumbs.map((item, index) => {
                    const isLast = index === breadcrumbs.length - 1;

                    return (
                        <Fragment key={index}>
                            <BreadcrumbItem className="max-w-[140px] truncate sm:max-w-[240px] md:max-w-[320px]">
                                {isLast ? (
                                    <BreadcrumbPage className="font-semibold text-foreground">
                                        <span
                                            className="truncate"
                                            title={item.title}
                                        >
                                            {item.title}
                                        </span>
                                    </BreadcrumbPage>
                                ) : (
                                    <BreadcrumbLink asChild>
                                        <Link
                                            href={item.href}
                                            className="truncate text-muted-foreground transition-colors hover:text-foreground"
                                            title={item.title}
                                        >
                                            {item.title}
                                        </Link>
                                    </BreadcrumbLink>
                                )}
                            </BreadcrumbItem>

                            {!isLast && (
                                <BreadcrumbSeparator>
                                    <ChevronRight className="size-3 text-muted-foreground/60" />
                                </BreadcrumbSeparator>
                            )}
                        </Fragment>
                    );
                })}
            </BreadcrumbList>
        </Breadcrumb>
    );
}
