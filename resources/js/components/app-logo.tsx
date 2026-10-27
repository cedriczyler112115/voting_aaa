export default function AppLogo() {
    return (
        <div className="flex items-center gap-2.5">
            <div className="flex aspect-square size-9 shrink-0 items-center justify-center bg-transparent">
                <img
                    src="/images/logo.png"
                    alt="4Ps AAA Voting Logo"
                    className="h-full w-full object-contain"
                />
            </div>
            <div className="grid flex-1 text-left leading-tight">
                <span className="truncate text-sm font-bold tracking-tight text-foreground">
                    4Ps AAA Voting
                </span>
                <span className="truncate text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Awards & Honors
                </span>
            </div>
        </div>
    );
}
