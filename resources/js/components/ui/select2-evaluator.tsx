import {
    Briefcase,
    Building2,
    Check,
    ChevronDown,
    Search,
    Shield,
    User,
    UserX,
    X,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export type Select2User = {
    id: number;
    name: string;
    email: string;
    role?: string;
    position?: string | null;
    department?: string | null;
};

type Select2EvaluatorProps = {
    users: Select2User[];
    value: number | null;
    onChange: (userId: number | null) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
};

export default function Select2Evaluator({
    users = [],
    value,
    onChange,
    placeholder = 'Select an evaluator...',
    disabled = false,
    className,
}: Select2EvaluatorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Find currently selected user
    const selectedUser = useMemo(() => {
        if (!value) return null;
        return users.find((u) => u.id === value) || null;
    }, [users, value]);

    // Filter users based on search query
    const filteredUsers = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return users;

        return users.filter((u) => {
            const nameMatch = u.name?.toLowerCase().includes(query);
            const emailMatch = u.email?.toLowerCase().includes(query);
            const posMatch = u.position?.toLowerCase().includes(query);
            const deptMatch = u.department?.toLowerCase().includes(query);
            return nameMatch || emailMatch || posMatch || deptMatch;
        });
    }, [users, searchQuery]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Close on escape key
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    // Focus search input when dropdown opens
    useEffect(() => {
        if (isOpen) {
            setHighlightedIndex(-1);
            const timer = setTimeout(() => {
                searchInputRef.current?.focus();
            }, 30);
            return () => clearTimeout(timer);
        } else {
            setSearchQuery('');
        }
    }, [isOpen]);

    // Scroll highlighted item into view
    useEffect(() => {
        if (highlightedIndex >= 0 && listRef.current) {
            const items = listRef.current.querySelectorAll<HTMLElement>('[data-select2-item]');
            const item = items[highlightedIndex];
            if (item) {
                item.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [highlightedIndex]);

    const handleSelect = (userId: number | null) => {
        onChange(userId);
        setIsOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(null);
    };

    // Keyboard navigation within list
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                e.preventDefault();
                setIsOpen(true);
            }
            return;
        }

        // Total options count: 1 (default option) + filteredUsers.length
        const totalOptions = 1 + filteredUsers.length;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex((prev) => (prev + 1 < totalOptions ? prev + 1 : 0));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : totalOptions - 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightedIndex === 0) {
                handleSelect(null);
            } else if (highlightedIndex > 0 && filteredUsers[highlightedIndex - 1]) {
                handleSelect(filteredUsers[highlightedIndex - 1].id);
            }
        }
    };

    const getUserInitials = (name: string) => {
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    return (
        <div
            ref={containerRef}
            className={cn('relative w-full', className)}
            onKeyDown={handleKeyDown}
        >
            {/* Select2 Trigger Box */}
            <div
                role="combobox"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                tabIndex={disabled ? -1 : 0}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={cn(
                    'group flex min-h-[38px] w-full items-center justify-between rounded-lg border bg-background px-3 py-1.5 text-xs text-foreground transition-all select-none',
                    disabled
                        ? 'cursor-not-allowed opacity-50 bg-muted/50 border-border/50'
                        : 'cursor-pointer hover:border-primary/50',
                    isOpen
                        ? 'border-primary ring-2 ring-primary/20 shadow-xs'
                        : 'border-border'
                )}
            >
                {/* Left: Selected Value Representation */}
                <div className="flex min-w-0 flex-1 items-center gap-2">
                    {selectedUser ? (
                        <>
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                                {getUserInitials(selectedUser.name)}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 truncate">
                                    <span className="font-semibold text-foreground truncate">
                                        {selectedUser.name}
                                    </span>
                                    {selectedUser.position && (
                                        <span className="hidden truncate text-[11px] text-muted-foreground sm:inline">
                                            • {selectedUser.position}
                                        </span>
                                    )}
                                </div>
                                {selectedUser.department && (
                                    <div className="truncate text-[10px] text-muted-foreground">
                                        {selectedUser.department}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center gap-2 text-foreground">
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                <Shield className="h-3 w-3" />
                            </div>
                            <span className="font-medium text-foreground">
                                Default (Division Chief / User ID: 2)
                            </span>
                            <span className="hidden rounded-sm bg-muted px-1.5 py-0.2 text-[10px] font-semibold text-muted-foreground sm:inline">
                                Fallback
                            </span>
                        </div>
                    )}
                </div>

                {/* Right: Clear button & Select2 Arrow */}
                <div className="flex shrink-0 items-center gap-1.5 pl-2">
                    {value !== null && !disabled && (
                        <button
                            type="button"
                            onClick={handleClear}
                            title="Clear selection (use default Division Chief)"
                            className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}

                    <div className="h-4 w-px bg-border/80" />

                    <ChevronDown
                        className={cn(
                            'h-4 w-4 text-muted-foreground transition-transform duration-200',
                            isOpen && 'rotate-180 text-primary'
                        )}
                    />
                </div>
            </div>

            {/* Select2 Dropdown Menu */}
            {isOpen && (
                <div
                    role="listbox"
                    className="absolute top-full left-0 z-50 mt-1.5 w-full rounded-xl border border-border bg-card shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100"
                >
                    {/* Search Field */}
                    <div className="border-b border-border/70 bg-muted/40 p-2">
                        <div className="relative flex items-center">
                            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by name, email, department, position..."
                                className="w-full rounded-lg border border-border bg-background py-1.5 pr-7 pl-8 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchQuery('');
                                        searchInputRef.current?.focus();
                                    }}
                                    className="absolute right-2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Options List */}
                    <div ref={listRef} className="max-h-60 overflow-y-auto py-1">
                        {/* Option 0: Default (Division Chief) Option */}
                        <div
                            data-select2-item
                            onClick={() => handleSelect(null)}
                            onMouseEnter={() => setHighlightedIndex(0)}
                            className={cn(
                                'flex items-center justify-between px-3 py-2 text-xs cursor-pointer transition-colors border-b border-border/40',
                                value === null
                                    ? 'bg-primary/10 text-primary font-semibold'
                                    : highlightedIndex === 0
                                      ? 'bg-muted/70'
                                      : 'hover:bg-muted/50'
                            )}
                        >
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                    <Shield className="h-3.5 w-3.5" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 font-bold">
                                        <span>Default (Division Chief / User ID: 2)</span>
                                        <span className="rounded-full bg-purple-500/10 px-2 py-0.2 text-[9px] font-bold text-purple-700 dark:text-purple-300">
                                            50%
                                        </span>
                                    </div>
                                    <div className="text-[11px] text-muted-foreground">
                                        Standard system fallback for 50% weighted scoring
                                    </div>
                                </div>
                            </div>
                            {value === null && (
                                <Check className="h-4 w-4 shrink-0 text-primary" />
                            )}
                        </div>

                        {/* Filtered User Candidates */}
                        {filteredUsers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
                                <UserX className="h-6 w-6 text-muted-foreground/60 mb-1" />
                                <p className="text-xs font-semibold text-foreground">
                                    No evaluators found
                                </p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                    No users matched "{searchQuery}"
                                </p>
                            </div>
                        ) : (
                            filteredUsers.map((u, index) => {
                                const optionIdx = index + 1;
                                const isSelected = value === u.id;
                                const isHighlighted = highlightedIndex === optionIdx;

                                return (
                                    <div
                                        key={u.id}
                                        data-select2-item
                                        onClick={() => handleSelect(u.id)}
                                        onMouseEnter={() => setHighlightedIndex(optionIdx)}
                                        className={cn(
                                            'flex items-center justify-between px-3 py-2 text-xs cursor-pointer transition-colors',
                                            isSelected
                                                ? 'bg-primary/10 font-semibold'
                                                : isHighlighted
                                                  ? 'bg-muted/70'
                                                  : 'hover:bg-muted/50'
                                        )}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                                                {getUserInitials(u.name)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-foreground truncate">
                                                        {u.name}
                                                    </span>
                                                    {u.role && (
                                                        <span className="rounded bg-muted px-1.5 py-0.2 text-[9px] font-semibold text-muted-foreground uppercase">
                                                            {u.role}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                                                    {u.position && (
                                                        <span className="flex items-center gap-1">
                                                            <Briefcase className="h-3 w-3 text-muted-foreground/70" />
                                                            {u.position}
                                                        </span>
                                                    )}
                                                    {u.department && (
                                                        <span className="flex items-center gap-1">
                                                            <Building2 className="h-3 w-3 text-muted-foreground/70" />
                                                            {u.department}
                                                        </span>
                                                    )}
                                                    {!u.position && !u.department && (
                                                        <span>{u.email}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {isSelected && (
                                            <Check className="h-4 w-4 shrink-0 text-primary ml-2" />
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer Info Bar */}
                    <div className="flex items-center justify-between border-t border-border/60 bg-muted/30 px-3 py-1.5 text-[10px] text-muted-foreground">
                        <span>
                            {filteredUsers.length} of {users.length} evaluators
                        </span>
                        <span>Use ↑↓ keys and Enter to select</span>
                    </div>
                </div>
            )}
        </div>
    );
}

