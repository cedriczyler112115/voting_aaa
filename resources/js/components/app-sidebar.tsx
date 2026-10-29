import { Link, router, usePage } from '@inertiajs/react';
import {
    Award,
    BarChart3,
    History,
    LayoutDashboard,
    LogOut,
    ShieldCheck,
    Trophy,
    User,
    Users,
    Vote,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { NavItem } from '@/types';

export function AppSidebar() {
    const { isCurrentOrParentUrl } = useCurrentUrl();
    const { auth } = usePage().props;
    const isAdmin = Boolean(
        auth?.user?.is_admin || auth?.user?.role === 'admin',
    );

    const voterNavItems: NavItem[] = [
        {
            title: 'Voting Events',
            href: '/dashboard',
            icon: Vote,
        },
        {
            title: 'Tabulation Result',
            href: '/tabulation-results',
            icon: Trophy,
            isActive: isCurrentOrParentUrl('/tabulation-results'),
        },
        {
            title: 'My Voting History',
            href: '/voting-history',
            icon: History,
        },
    ];

    const adminNavItems: NavItem[] = [
        {
            title: 'Admin Overview',
            href: '/admin',
            icon: LayoutDashboard,
        },
        {
            title: 'Manage Events',
            href: '/admin/events',
            icon: Award,
        },
        {
            title: 'Voter Directory',
            href: '/admin/voters',
            icon: Users,
        },
        {
            title: 'Results & Reports',
            href: '/admin/results',
            icon: BarChart3,
        },
        {
            title: 'Audit Logs',
            href: '/admin/audit-logs',
            icon: ShieldCheck,
        },
    ];

    const accountNavItems: NavItem[] = [
        {
            title: 'Profile',
            href: '/settings/profile',
            icon: User,
        },
        {
            title: 'Log Out',
            href: '/logout',
            icon: LogOut,
            method: 'post',
            as: 'button',
            onClick: () => {
                router.flushAll();
            },
        },
    ];

    return (
        <Sidebar
            collapsible="offcanvas"
            variant="sidebar"
            className="border-r border-sidebar-border/60"
        >
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="gap-2 pt-2">
                <NavMain items={voterNavItems} label="Voter Portal" />

                {isAdmin && (
                    <NavMain items={adminNavItems} label="Administration" />
                )}

                <NavMain items={accountNavItems} label="Account" />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
