import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    Award,
    Briefcase,
    Building2,
    Camera,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Copy,
    Edit3,
    ExternalLink,
    MapPin,
    Percent,
    Plus,
    Search,
    ShieldAlert,
    ShieldCheck,
    Sliders,
    Trash2,
    User,
    UserCheck,
    Users,
    UserX,
    X,
} from 'lucide-react';
import { FormEvent, useMemo, useRef, useState } from 'react';
import AppLayout from '@/layouts/app-layout';

type NomineeItem = {
    id: number;
    name: string;
    description: string | null;
    photo_path: string | null;
    department: string | null;
    organization: string | null;
    status: string;
    display_order: number;
    votes_count: number;
};

type AwardItem = {
    id: number;
    name: string;
    description: string | null;
    image_path: string | null;
    starts_at: string | null;
    ends_at: string | null;
    status: string;
    allow_vote_changes: boolean | null;
    results_visibility: string;
    display_order: number;
    nominees_count: number;
    votes_count: number;
    criteria?: CriterionItem[];
    total_criteria_score?: number;
    nominees: NomineeItem[];
};

type AllowedVoter = {
    id: number;
    user_id: number;
    name: string;
    email: string;
    role: string;
    is_eligible: boolean;
    reason: string | null;
    created_at: string | null;
};

type UserCandidate = {
    id: number;
    name: string;
    email: string;
    role: string;
    position?: string | null;
    department?: string | null;
};

type CriterionItem = {
    id: number;
    name: string;
    description: string | null;
    max_score: number;
    display_order: number;
};

type EventDetail = {
    id: number;
    title: string;
    slug: string;
    description: string | null;
    banner_path: string | null;
    status: string;
    computed_status: string;
    starts_at: string | null;
    ends_at: string | null;
    reveal_date: string | null;
    results_visibility: string;
    allow_vote_changes: boolean;
    created_by: string;
    created_at: string;
    total_awards: number;
    total_votes: number;
    total_criteria_score?: number;
    criteria?: CriterionItem[];
    allowed_voters_count: number;
    allowed_voters: AllowedVoter[];
    awards: AwardItem[];
};

type Props = {
    event: EventDetail;
    all_users?: UserCandidate[];
};

export default function EventShow({ event, all_users = [] }: Props) {
    const { flash, errors } = usePage<{
        flash?: { success?: string; error?: string };
        errors: Record<string, string>;
    }>().props;

    // Modals
    const [isEditEventOpen, setIsEditEventOpen] = useState(false);
    const [isAddAwardOpen, setIsAddAwardOpen] = useState(false);
    const [editingAward, setEditingAward] = useState<AwardItem | null>(null);
    const [addingNomineeAward, setAddingNomineeAward] =
        useState<AwardItem | null>(null);
    const [editingNominee, setEditingNominee] = useState<NomineeItem | null>(
        null,
    );

    // Event Edit Form
    const [eventForm, setEventForm] = useState({
        title: event.title,
        slug: event.slug,
        description: event.description || '',
        starts_at: event.starts_at || '',
        ends_at: event.ends_at || '',
        reveal_date: event.reveal_date || '',
        status: event.status,
        results_visibility: event.results_visibility,
        allow_vote_changes: event.allow_vote_changes,
    });

    // Award Form
    const [awardForm, setAwardForm] = useState({
        name: '',
        description: '',
        starts_at: '',
        ends_at: '',
        status: 'active',
        results_visibility: 'inherit',
        display_order: 0,
    });

    // Nominee Form
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [nomineeForm, setNomineeForm] = useState<{
        name: string;
        description: string;
        department: string;
        organization: string;
        status: string;
        display_order: number;
        photo: File | null;
        photo_preview: string | null;
        remove_photo: boolean;
    }>({
        name: '',
        description: '',
        department: '',
        organization: '',
        status: 'active',
        display_order: 0,
        photo: null,
        photo_preview: null,
        remove_photo: false,
    });

    const [processing, setProcessing] = useState(false);

    const closeNomineeModal = () => {
        setAddingNomineeAward(null);
        setEditingNominee(null);
        setNomineeForm({
            name: '',
            description: '',
            department: '',
            organization: '',
            status: 'active',
            display_order: 0,
            photo: null,
            photo_preview: null,
            remove_photo: false,
        });
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const openAddNomineeModal = (award: AwardItem) => {
        setNomineeForm({
            name: '',
            description: '',
            department: '',
            organization: '',
            status: 'active',
            display_order: award.nominees.length + 1,
            photo: null,
            photo_preview: null,
            remove_photo: false,
        });
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        setAddingNomineeAward(award);
    };

    const openEditNomineeModal = (nominee: NomineeItem) => {
        setNomineeForm({
            name: nominee.name,
            description: nominee.description || '',
            department: nominee.department || '',
            organization: nominee.organization || '',
            status: nominee.status,
            display_order: nominee.display_order,
            photo: null,
            photo_preview: nominee.photo_path || null,
            remove_photo: false,
        });
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        setEditingNominee(nominee);
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setNomineeForm((prev) => ({
                ...prev,
                photo: file,
                photo_preview: URL.createObjectURL(file),
                remove_photo: false,
            }));
        }
        e.target.value = '';
    };

    const handleRemoveNomineePhoto = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        setNomineeForm((prev) => ({
            ...prev,
            photo: null,
            photo_preview: null,
            remove_photo: true,
        }));
    };

    // Event Update Submit
    const handleUpdateEvent = (e: FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        router.put(`/admin/events/${event.id}`, eventForm, {
            onSuccess: () => setIsEditEventOpen(false),
            onFinish: () => setProcessing(false),
        });
    };

    // Quick Status Change
    const handleQuickStatusChange = (newStatus: string) => {
        router.post(`/admin/events/${event.id}/status`, { status: newStatus });
    };

    // Add Award Submit
    const handleAddAward = (e: FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        router.post(`/admin/events/${event.id}/awards`, awardForm, {
            onSuccess: () => {
                setIsAddAwardOpen(false);
                setAwardForm({
                    name: '',
                    description: '',
                    starts_at: '',
                    ends_at: '',
                    status: 'active',
                    results_visibility: 'inherit',
                    display_order: 0,
                });
            },
            onFinish: () => setProcessing(false),
        });
    };

    // Edit Award Submit
    const handleUpdateAward = (e: FormEvent) => {
        e.preventDefault();
        if (!editingAward) return;
        setProcessing(true);
        router.put(`/admin/awards/${editingAward.id}`, awardForm, {
            onSuccess: () => setEditingAward(null),
            onFinish: () => setProcessing(false),
        });
    };

    // Delete Award
    const handleDeleteAward = (award: AwardItem) => {
        if (
            !confirm(
                `Are you sure you want to delete award category "${award.name}"?`,
            )
        )
            return;
        router.delete(`/admin/awards/${award.id}`);
    };

    // Add Nominee Submit
    const handleAddNominee = (e: FormEvent) => {
        e.preventDefault();
        if (!addingNomineeAward) return;
        setProcessing(true);

        const formData = new FormData();
        formData.append('name', nomineeForm.name);
        formData.append('description', nomineeForm.description || '');
        formData.append('department', nomineeForm.department || '');
        formData.append('organization', nomineeForm.organization || '');
        formData.append('status', nomineeForm.status);
        formData.append('display_order', String(nomineeForm.display_order));
        if (nomineeForm.photo) {
            formData.append('photo', nomineeForm.photo);
        }

        router.post(
            `/admin/awards/${addingNomineeAward.id}/nominees`,
            formData,
            {
                onSuccess: () => {
                    closeNomineeModal();
                },
                onFinish: () => setProcessing(false),
            },
        );
    };

    // Edit Nominee Submit
    const handleUpdateNominee = (e: FormEvent) => {
        e.preventDefault();
        if (!editingNominee) return;
        setProcessing(true);

        const formData = new FormData();
        formData.append('_method', 'put');
        formData.append('name', nomineeForm.name);
        formData.append('description', nomineeForm.description || '');
        formData.append('department', nomineeForm.department || '');
        formData.append('organization', nomineeForm.organization || '');
        formData.append('status', nomineeForm.status);
        formData.append('display_order', String(nomineeForm.display_order));
        if (nomineeForm.photo) {
            formData.append('photo', nomineeForm.photo);
        }
        if (nomineeForm.remove_photo) {
            formData.append('remove_photo', '1');
        }

        router.post(
            `/admin/nominees/${editingNominee.id}`,
            formData,
            {
                onSuccess: () => {
                    closeNomineeModal();
                },
                onFinish: () => setProcessing(false),
            },
        );
    };

    // Delete Nominee
    const handleDeleteNominee = (nominee: NomineeItem) => {
        if (
            !confirm(
                `Are you sure you want to delete nominee "${nominee.name}"?`,
            )
        )
            return;
        router.delete(`/admin/nominees/${nominee.id}`);
    };

    // Active Tab: 'awards' | 'voters'
    const [activeTab, setActiveTab] = useState<'awards' | 'voters'>('awards');

    // Criteria Management State per Award Category
    const [addingCriterionAward, setAddingCriterionAward] = useState<AwardItem | null>(null);
    const [isAddCriterionOpen, setIsAddCriterionOpen] = useState(false);
    const [editingCriterion, setEditingCriterion] = useState<CriterionItem | null>(null);
    const [criterionForm, setCriterionForm] = useState({
        name: '',
        description: '',
        max_score: 20,
        display_order: 1,
    });

    const openAddCriterionModal = (award: AwardItem) => {
        setAddingCriterionAward(award);
        setCriterionForm({
            name: '',
            description: '',
            max_score: 20,
            display_order: (award.criteria?.length || 0) + 1,
        });
        setIsAddCriterionOpen(true);
    };

    const handleAddCriterion = (e: FormEvent) => {
        e.preventDefault();
        if (!addingCriterionAward) return;
        setProcessing(true);
        router.post(`/admin/awards/${addingCriterionAward.id}/criteria`, criterionForm, {
            onSuccess: () => {
                setIsAddCriterionOpen(false);
                setAddingCriterionAward(null);
                setCriterionForm({
                    name: '',
                    description: '',
                    max_score: 20,
                    display_order: 1,
                });
            },
            onFinish: () => setProcessing(false),
        });
    };

    const handleUpdateCriterion = (e: FormEvent) => {
        e.preventDefault();
        if (!editingCriterion) return;
        setProcessing(true);
        router.put(`/admin/criteria/${editingCriterion.id}`, criterionForm, {
            onSuccess: () => {
                setEditingCriterion(null);
                setAddingCriterionAward(null);
            },
            onFinish: () => setProcessing(false),
        });
    };

    const handleDeleteCriterion = (criterion: CriterionItem) => {
        if (!confirm(`Are you sure you want to delete criterion "${criterion.name}"?`)) return;
        router.delete(`/admin/criteria/${criterion.id}`);
    };

    const handleCopyCriteriaToAll = (award: AwardItem) => {
        if (!confirm(`Copy all criteria from "${award.name}" to all other award categories in this event? This will overwrite existing criteria in the other categories.`)) return;
        router.post(`/admin/awards/${award.id}/criteria/copy-to-all`);
    };

    // Voter List Management State
    const [isAddVotersOpen, setIsAddVotersOpen] = useState(false);
    const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
    const [voterSearch, setVoterSearch] = useState('');
    const [userModalSearch, setUserModalSearch] = useState('');
    const [modalPage, setModalPage] = useState(1);
    const [modalPageSize, setModalPageSize] = useState(15);

    // Handlers for Allowed Voters
    const handleAddVotersSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (selectedUserIds.length === 0) return;
        setProcessing(true);
        router.post(
            `/admin/events/${event.id}/voters`,
            { user_ids: selectedUserIds },
            {
                onSuccess: () => {
                    setIsAddVotersOpen(false);
                    setSelectedUserIds([]);
                    setUserModalSearch('');
                    setModalPage(1);
                },
                onFinish: () => setProcessing(false),
            },
        );
    };

    const handleRemoveVoter = (voter: AllowedVoter) => {
        if (
            !confirm(
                `Are you sure you want to remove "${voter.name}" from the authorized voter list? They will no longer be permitted to vote in this event.`,
            )
        ) {
            return;
        }
        router.delete(`/admin/events/${event.id}/voters/${voter.user_id}`);
    };

    const handleAllowAllVoters = () => {
        if (
            !confirm(
                `Authorize all registered active users (is_status = 1) in the system to vote in "${event.title}"? This will enroll all eligible accounts into the allowed voters list.`,
            )
        ) {
            return;
        }
        router.post(`/admin/events/${event.id}/voters/allow-all`);
    };

    const handleClearVoters = () => {
        if (
            !confirm(
                `Are you sure you want to clear the entire voter list for "${event.title}"? No users will be allowed to vote until voters are explicitly enrolled again.`,
            )
        ) {
            return;
        }
        router.post(`/admin/events/${event.id}/voters/clear`);
    };

    const alreadyEnrolledUserIds = useMemo(() => {
        return new Set(
            (event.allowed_voters || []).map((voter) => voter.user_id),
        );
    }, [event.allowed_voters]);

    const filteredVoters = useMemo(() => {
        const query = voterSearch.trim().toLowerCase();
        if (!query) return event.allowed_voters || [];
        return (event.allowed_voters || []).filter(
            (v) =>
                v.name.toLowerCase().includes(query) ||
                v.email.toLowerCase().includes(query),
        );
    }, [event.allowed_voters, voterSearch]);

    const modalCandidateUsers = useMemo(() => {
        const query = userModalSearch.trim().toLowerCase();
        if (!query) return all_users;
        return all_users.filter(
            (u) =>
                u.name.toLowerCase().includes(query) ||
                u.email.toLowerCase().includes(query) ||
                (u.department && u.department.toLowerCase().includes(query)) ||
                (u.position && u.position.toLowerCase().includes(query)),
        );
    }, [all_users, userModalSearch]);

    const modalTotalUsers = modalCandidateUsers.length;
    const modalTotalPages = Math.max(
        1,
        Math.ceil(modalTotalUsers / modalPageSize),
    );
    const safeModalPage = Math.min(Math.max(1, modalPage), modalTotalPages);

    const paginatedCandidateUsers = useMemo(() => {
        const start = (safeModalPage - 1) * modalPageSize;
        return modalCandidateUsers.slice(start, start + modalPageSize);
    }, [modalCandidateUsers, safeModalPage, modalPageSize]);

    const toggleUserSelection = (userId: number) => {
        setSelectedUserIds((prev) =>
            prev.includes(userId)
                ? prev.filter((id) => id !== userId)
                : [...prev, userId],
        );
    };

    const handleSelectAllOnPage = () => {
        const availablePageIds = paginatedCandidateUsers
            .filter((u) => !alreadyEnrolledUserIds.has(u.id))
            .map((u) => u.id);
        setSelectedUserIds((prev) =>
            Array.from(new Set([...prev, ...availablePageIds])),
        );
    };

    const handleDeselectAllOnPage = () => {
        const pageIds = new Set(paginatedCandidateUsers.map((u) => u.id));
        setSelectedUserIds((prev) => prev.filter((id) => !pageIds.has(id)));
    };

    const handleSelectAllFilteredUsers = () => {
        const availableIds = modalCandidateUsers
            .filter((u) => !alreadyEnrolledUserIds.has(u.id))
            .map((u) => u.id);
        setSelectedUserIds(availableIds);
    };

    const breadcrumbs = [
        { title: 'Administration', href: '/admin' },
        { title: 'Voting Events', href: '/admin/events' },
        { title: event.title, href: `/admin/events/${event.id}` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Manage - ${event.title}`} />

            <div className="voting-container flex w-full flex-1 flex-col gap-8 p-4 sm:p-6 lg:p-8">
                {/* Back button */}
                <div>
                    <Link
                        href="/admin/events"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Back to All Events
                    </Link>
                </div>

                {/* Notifications */}
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

                {/* Event Hero Details & Controls */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                                    Status:{' '}
                                    {event.computed_status.toUpperCase()}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    Visibility:{' '}
                                    {event.results_visibility.replace('_', ' ')}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    •{' '}
                                    {event.allow_vote_changes
                                        ? 'Vote changes permitted'
                                        : 'Final votes'}
                                </span>
                            </div>

                            <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                                {event.title}
                            </h1>
                            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                                {event.description ||
                                    'No description provided.'}
                            </p>

                            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                                <div>
                                    URL Slug:{' '}
                                    <span className="font-mono font-semibold text-foreground">
                                        /voting/{event.slug}
                                    </span>
                                </div>
                                <span>•</span>
                                <div>
                                    Total Categories:{' '}
                                    <strong className="text-foreground">
                                        {event.total_awards}
                                    </strong>
                                </div>
                                <span>•</span>
                                <div>
                                    Total Ballots:{' '}
                                    <strong className="text-foreground">
                                        {event.total_votes}
                                    </strong>
                                </div>
                                {event.reveal_date && (
                                    <>
                                        <span>•</span>
                                        <div>
                                            Reveal Date:{' '}
                                            <strong className="text-primary font-semibold">
                                                {event.reveal_date}
                                            </strong>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Actions & Status Dropdown */}
                        <div className="flex flex-wrap items-center gap-2.5">
                            <select
                                value={event.status}
                                onChange={(e) =>
                                    handleQuickStatusChange(e.target.value)
                                }
                                className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                            >
                                <option value="draft">Draft</option>
                                <option value="scheduled">Scheduled</option>
                                <option value="published">
                                    Published (Active)
                                </option>
                                <option value="closed">Closed</option>
                                <option value="archived">Archived</option>
                            </select>

                            <button
                                type="button"
                                onClick={() => setIsEditEventOpen(true)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                            >
                                <Edit3 className="h-3.5 w-3.5" />
                                Edit Event
                            </button>

                            <Link
                                href={`/voting/${event.slug}`}
                                target="_blank"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Voter Preview
                            </Link>

                            <button
                                type="button"
                                onClick={() => {
                                    setAwardForm({
                                        name: '',
                                        description: '',
                                        starts_at: '',
                                        ends_at: '',
                                        status: 'active',
                                        results_visibility: 'inherit',
                                        display_order: event.awards.length + 1,
                                    });
                                    setIsAddAwardOpen(true);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
                            >
                                <Plus className="h-4 w-4" />
                                Add Award Category
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tabs Switcher: Award Categories vs Evaluation Criteria vs Authorized Voters */}
                <div className="flex border-b border-border">
                    <button
                        type="button"
                        onClick={() => setActiveTab('awards')}
                        className={`inline-flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
                            activeTab === 'awards'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                        }`}
                    >
                        <Award className="h-4 w-4" />
                        <span>Award Categories</span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                            {event.awards.length}
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('voters')}
                        className={`inline-flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
                            activeTab === 'voters'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                        }`}
                    >
                        <Users className="h-4 w-4" />
                        <span>Authorized Voters</span>
                        <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                event.allowed_voters_count > 0
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            }`}
                        >
                            {event.allowed_voters_count}
                        </span>
                    </button>
                </div>

                {activeTab === 'awards' ? (
                    /* Awards & Nominees Manager */
                    <div className="flex flex-col gap-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold tracking-tight text-foreground">
                                    Award Categories ({event.awards.length})
                                </h2>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    Add categories, set nominees, configure
                                    custom schedules, and view category
                                    standings.
                                </p>
                            </div>
                        </div>

                        {event.awards.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
                                <Award className="mx-auto h-10 w-10 text-muted-foreground/60" />
                                <h3 className="mt-3 text-base font-semibold text-foreground">
                                    No Award Categories Created
                                </h3>
                                <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                                    This voting event does not have any awards
                                    yet. Click below to add the first award
                                    category (e.g. Best Employee of the Year).
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setIsAddAwardOpen(true)}
                                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                                >
                                    <Plus className="h-4 w-4" />
                                    Add First Award
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-6">
                                {event.awards.map((award, index) => (
                                    <div
                                        key={award.id}
                                        className="overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm"
                                    >
                                        {/* Award Header */}
                                        <div className="flex flex-col gap-3 border-b border-border/50 pb-4 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex items-start gap-3">
                                                <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
                                                    <Award className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                                            Award #{index + 1}
                                                        </span>
                                                        <span
                                                            className={`py-0.2 rounded-full px-2 text-[10px] font-bold capitalize ${
                                                                award.status ===
                                                                'active'
                                                                    ? 'bg-emerald-500/10 text-emerald-600'
                                                                    : 'bg-neutral-500/10 text-neutral-600'
                                                            }`}
                                                        >
                                                            {award.status}
                                                        </span>
                                                    </div>
                                                    <h3 className="mt-0.5 text-lg font-bold text-foreground">
                                                        {award.name}
                                                    </h3>
                                                    {award.description && (
                                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                                            {award.description}
                                                        </p>
                                                    )}
                                                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                                                        <span>
                                                            {
                                                                award.nominees
                                                                    .length
                                                            }{' '}
                                                            Nominees
                                                        </span>
                                                        <span>•</span>
                                                        <span>
                                                            {award.votes_count}{' '}
                                                            Votes Recorded
                                                        </span>
                                                        <span>•</span>
                                                        <span
                                                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                                                                (award.total_criteria_score ?? 0) === 100
                                                                    ? 'bg-emerald-500/10 text-emerald-600'
                                                                    : 'bg-amber-500/10 text-amber-600'
                                                            }`}
                                                        >
                                                            <Sliders className="h-3 w-3" />
                                                            Criteria: {award.criteria?.length || 0} ({award.total_criteria_score || 0}%)
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Award Action Buttons */}
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => openAddCriterionModal(award)}
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                                                    title="Add evaluation criterion to this award category"
                                                >
                                                    <Sliders className="h-3.5 w-3.5 text-primary" />
                                                    Add Criterion
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => openAddNomineeModal(award)}
                                                    className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/80"
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                    Add Nominee
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setAwardForm({
                                                            name: award.name,
                                                            description:
                                                                award.description ||
                                                                '',
                                                            starts_at:
                                                                award.starts_at ||
                                                                '',
                                                            ends_at:
                                                                award.ends_at ||
                                                                '',
                                                            status: award.status,
                                                            results_visibility:
                                                                award.results_visibility,
                                                            display_order:
                                                                award.display_order,
                                                        });
                                                        setEditingAward(award);
                                                    }}
                                                    className="rounded-lg border border-border p-1.5 text-foreground hover:bg-muted"
                                                    title="Edit award"
                                                >
                                                    <Edit3 className="h-3.5 w-3.5" />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleDeleteAward(award)
                                                    }
                                                    className="rounded-lg border border-red-500/30 p-1.5 text-red-600 hover:bg-red-500/10"
                                                    title="Delete award"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Nominees Grid */}
                                        <div className="mt-4">
                                            <div className="mb-2.5 flex items-center justify-between">
                                                <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                                    Nominees under this Award ({award.nominees.length}):
                                                </div>
                                            </div>

                                            {award.nominees.length === 0 ? (
                                                <div className="rounded-xl border border-dashed border-border/80 p-5 text-center text-xs text-muted-foreground">
                                                    No nominees added yet. Click
                                                    "Add Nominee" above to list
                                                    candidates.
                                                </div>
                                            ) : (
                                                <div className="overflow-x-auto pb-1">
                                                    <div className="grid grid-cols-5 gap-2.5 min-w-[620px] lg:min-w-0">
                                                        {award.nominees.map(
                                                            (nominee) => (
                                                                <div
                                                                    key={nominee.id}
                                                                    className="group flex flex-col justify-between overflow-hidden rounded-xl border border-border/70 bg-card transition-all hover:border-border hover:shadow-xs"
                                                                >
                                                                    <div>
                                                                        {/* Photo Container */}
                                                                        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
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
                                                                                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted/50 to-muted text-muted-foreground/40">
                                                                                    <User className="h-8 w-8" />
                                                                                </div>
                                                                            )}

                                                                            {/* Status indicator on top-left */}
                                                                            <div className="absolute top-1.5 left-1.5">
                                                                                <span
                                                                                    className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold shadow-xs backdrop-blur-xs ${
                                                                                        nominee.status ===
                                                                                        'active'
                                                                                            ? 'bg-emerald-500/90 text-white'
                                                                                            : 'bg-neutral-800/90 text-neutral-200'
                                                                                    }`}
                                                                                >
                                                                                    {nominee.status ===
                                                                                    'active'
                                                                                        ? 'Active'
                                                                                        : 'Inactive'}
                                                                                </span>
                                                                            </div>

                                                                            {/* Transfer the edit and delete button in the bottom of the picture/photo */}
                                                                            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/85 via-black/55 to-transparent p-1.5 pt-4">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => openEditNomineeModal(nominee)}
                                                                                    className="inline-flex items-center gap-1 rounded bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white shadow-xs backdrop-blur-xs transition-colors hover:bg-white/35 active:scale-95"
                                                                                    title="Edit nominee"
                                                                                >
                                                                                    <Edit3 className="h-3 w-3" />
                                                                                    <span>Edit</span>
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() =>
                                                                                        handleDeleteNominee(
                                                                                            nominee,
                                                                                        )
                                                                                    }
                                                                                    className="inline-flex items-center gap-1 rounded bg-red-600/85 px-2 py-0.5 text-[10px] font-semibold text-white shadow-xs backdrop-blur-xs transition-colors hover:bg-red-600 active:scale-95"
                                                                                    title="Delete nominee"
                                                                                >
                                                                                    <Trash2 className="h-3 w-3" />
                                                                                    <span>Delete</span>
                                                                                </button>
                                                                            </div>
                                                                        </div>

                                                                        {/* Data Information Section - covers the full width of the card */}
                                                                        <div className="flex flex-col gap-1 p-2.5">
                                                                            <div
                                                                                className="text-xs font-bold leading-tight text-foreground break-words"
                                                                                title={
                                                                                    nominee.name
                                                                                }
                                                                            >
                                                                                {
                                                                                    nominee.name
                                                                                }
                                                                            </div>

                                                                            {nominee.department && (
                                                                                <div
                                                                                    className="flex items-start gap-1 text-[11px] leading-tight text-muted-foreground"
                                                                                    title={`Designation: ${nominee.department}`}
                                                                                >
                                                                                    <Briefcase className="mt-0.5 h-3 w-3 shrink-0 text-primary/70" />
                                                                                    <span className="break-words">
                                                                                        {
                                                                                            nominee.department
                                                                                        }
                                                                                    </span>
                                                                                </div>
                                                                            )}

                                                                            {nominee.organization && (
                                                                                <div
                                                                                    className="flex items-start gap-1 text-[11px] leading-tight text-muted-foreground"
                                                                                    title={`Area of Assignment: ${nominee.organization}`}
                                                                                >
                                                                                    <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-primary/70" />
                                                                                    <span className="break-words">
                                                                                        {
                                                                                            nominee.organization
                                                                                        }
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Card Footer with Votes Cast */}
                                                                    <div className="border-t border-border/40 bg-muted/20 px-2.5 py-1.5 text-[10px] font-semibold text-primary">
                                                                        {nominee.votes_count}{' '}
                                                                        {nominee.votes_count === 1 ? 'vote' : 'votes'} cast
                                                                    </div>
                                                                </div>
                                                            ),
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Evaluation Criteria for this Award */}
                                        <div className="mt-6 border-t border-border/60 pt-5">
                                            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                                                        <Sliders className="h-4 w-4 text-primary" />
                                                        <span>Evaluation Criteria ({award.criteria?.length || 0})</span>
                                                    </div>
                                                    <span
                                                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                                            (award.total_criteria_score ?? 0) === 100
                                                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                                                : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                                        }`}
                                                    >
                                                        {(award.total_criteria_score ?? 0) === 100
                                                            ? '100% Valid Rubric'
                                                            : `Weight Total: ${award.total_criteria_score ?? 0}% (Must equal 100%)`}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {award.criteria && award.criteria.length > 0 && event.awards.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCopyCriteriaToAll(award)}
                                                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted"
                                                            title="Copy criteria from this award to all other award categories"
                                                        >
                                                            <Copy className="h-3 w-3 text-muted-foreground" />
                                                            Copy to All
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => openAddCriterionModal(award)}
                                                        className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                                                    >
                                                        <Plus className="h-3.5 w-3.5" />
                                                        Add Criterion
                                                    </button>
                                                </div>
                                            </div>

                                            {(!award.criteria || award.criteria.length === 0) ? (
                                                <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-5 text-center text-xs text-muted-foreground">
                                                    No evaluation criteria configured for this award category yet. Click <span className="font-semibold text-foreground">"Add Criterion"</span> above to build the 100% scoring rubric.
                                                </div>
                                            ) : (
                                                <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
                                                    <div className="divide-y divide-border/60">
                                                        {award.criteria.map((criterion, idx) => (
                                                            <div
                                                                key={criterion.id}
                                                                className="flex flex-col gap-2 p-3.5 transition-colors hover:bg-muted/20 sm:flex-row sm:items-center sm:justify-between"
                                                            >
                                                                <div className="flex items-start gap-3">
                                                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-bold text-foreground">
                                                                        {criterion.display_order || idx + 1}
                                                                    </span>
                                                                    <div className="min-w-0">
                                                                        <div className="text-xs font-bold text-foreground">
                                                                            {criterion.name}
                                                                        </div>
                                                                        {criterion.description && (
                                                                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                                                                                {criterion.description}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center justify-between gap-3 pl-9 sm:justify-end sm:pl-0">
                                                                    <span className="rounded-md border border-border/80 bg-muted/40 px-2.5 py-1 font-mono text-xs font-bold text-foreground">
                                                                        {criterion.max_score} pts ({criterion.max_score}%)
                                                                    </span>

                                                                    <div className="flex items-center gap-1">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setEditingCriterion(criterion);
                                                                                setAddingCriterionAward(award);
                                                                                setCriterionForm({
                                                                                    name: criterion.name,
                                                                                    description: criterion.description || '',
                                                                                    max_score: criterion.max_score,
                                                                                    display_order: criterion.display_order,
                                                                                });
                                                                            }}
                                                                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                                                            title="Edit criterion"
                                                                        >
                                                                            <Edit3 className="h-3.5 w-3.5" />
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleDeleteCriterion(criterion)}
                                                                            className="rounded p-1 text-red-500 hover:bg-red-500/10"
                                                                            title="Delete criterion"
                                                                        >
                                                                            <Trash2 className="h-3.5 w-3.5" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    /* Authorized Voters Manager */
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-xl font-bold tracking-tight text-foreground">
                                    Authorized Voters (
                                    {event.allowed_voters.length})
                                </h2>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    Whitelisted Criteria: Only users explicitly
                                    enrolled on this list are allowed to vote in
                                    this event.
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleAllowAllVoters}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"
                                    title="Enroll all registered users as eligible voters"
                                >
                                    <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                                    Enroll All Users
                                </button>
                                {event.allowed_voters.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleClearVoters}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-500/10"
                                        title="Remove all voters from the allowed list"
                                    >
                                        <UserX className="h-3.5 w-3.5" />
                                        Clear List
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedUserIds([]);
                                        setUserModalSearch('');
                                        setModalPage(1);
                                        setIsAddVotersOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                                >
                                    <Plus className="h-4 w-4" />
                                    Add Authorized Voters
                                </button>
                            </div>
                        </div>

                        {/* Whitelist Criteria Info Banner */}
                        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs text-muted-foreground">
                            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                            <div>
                                <p className="font-semibold text-foreground">
                                    Strict Event-Level Voter Eligibility Rule
                                    Active
                                </p>
                                <p className="mt-0.5">
                                    Each event enforces an isolated list of
                                    allowed voters. When a user navigates to the
                                    ballot or casts a vote, the backend verifies
                                    their account against this table. If not
                                    present or restricted, access and vote
                                    submission are blocked.
                                </p>
                            </div>
                        </div>

                        {/* Search Bar */}
                        <div className="flex items-center gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search authorized voters by name or email..."
                                    value={voterSearch}
                                    onChange={(e) =>
                                        setVoterSearch(e.target.value)
                                    }
                                    className="w-full rounded-lg border border-border bg-card py-2 pr-4 pl-9 text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Voters Table or Empty State */}
                        {filteredVoters.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
                                <Users className="mx-auto h-10 w-10 text-muted-foreground/60" />
                                <h3 className="mt-3 text-base font-semibold text-foreground">
                                    {event.allowed_voters.length === 0
                                        ? 'No Authorized Voters Registered'
                                        : 'No Voters Match Your Search'}
                                </h3>
                                <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
                                    {event.allowed_voters.length === 0
                                        ? 'Currently, no users are permitted to vote in this event. Click below to add specific users or enroll all registered users.'
                                        : 'Try adjusting your search query.'}
                                </p>
                                {event.allowed_voters.length === 0 && (
                                    <div className="mt-5 flex justify-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedUserIds([]);
                                                setUserModalSearch('');
                                                setModalPage(1);
                                                setIsAddVotersOpen(true);
                                            }}
                                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                                        >
                                            <Plus className="h-4 w-4" />
                                            Add Voters
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleAllowAllVoters}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                                        >
                                            <UserCheck className="h-4 w-4 text-emerald-600" />
                                            Enroll All Users
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                                            <tr>
                                                <th className="px-4 py-3">
                                                    Voter
                                                </th>
                                                <th className="px-4 py-3">
                                                    Email Address
                                                </th>
                                                <th className="px-4 py-3">
                                                    System Role
                                                </th>
                                                <th className="px-4 py-3">
                                                    Status
                                                </th>
                                                <th className="px-4 py-3">
                                                    Enrolled At
                                                </th>
                                                <th className="px-4 py-3 text-right">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/60">
                                            {filteredVoters.map((voter) => (
                                                <tr
                                                    key={voter.id}
                                                    className="transition-colors hover:bg-muted/30"
                                                >
                                                    <td className="px-4 py-3 font-semibold text-foreground">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                                                {voter.name
                                                                    .charAt(0)
                                                                    .toUpperCase()}
                                                            </div>
                                                            <span>
                                                                {voter.name}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-muted-foreground">
                                                        {voter.email || '—'}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="rounded-full bg-neutral-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-neutral-600 uppercase dark:text-neutral-400">
                                                            {voter.role}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {voter.is_eligible ? (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                                                <CheckCircle2 className="h-3 w-3" />
                                                                Authorized
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-600">
                                                                Restricted
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-muted-foreground">
                                                        {voter.created_at ||
                                                            '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleRemoveVoter(
                                                                    voter,
                                                                )
                                                            }
                                                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-500/10"
                                                            title="Revoke voting eligibility"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                            Remove
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="border-t border-border bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground">
                                    Showing {filteredVoters.length} of{' '}
                                    {event.allowed_voters.length} authorized
                                    voters
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Edit Event Modal */}
            {isEditEventOpen && (
                <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200 fade-in">
                    <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-border/70 pb-4">
                            <h2 className="text-lg font-bold text-foreground">
                                Edit Event Settings
                            </h2>
                            <button
                                type="button"
                                onClick={() => setIsEditEventOpen(false)}
                                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form
                            onSubmit={handleUpdateEvent}
                            className="mt-5 space-y-4"
                        >
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-foreground">
                                    Event Title *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={eventForm.title}
                                    onChange={(e) =>
                                        setEventForm({
                                            ...eventForm,
                                            title: e.target.value,
                                        })
                                    }
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-foreground">
                                    URL Slug
                                </label>
                                <input
                                    type="text"
                                    value={eventForm.slug}
                                    onChange={(e) =>
                                        setEventForm({
                                            ...eventForm,
                                            slug: e.target.value,
                                        })
                                    }
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-foreground">
                                    Description
                                </label>
                                <textarea
                                    rows={3}
                                    value={eventForm.description}
                                    onChange={(e) =>
                                        setEventForm({
                                            ...eventForm,
                                            description: e.target.value,
                                        })
                                    }
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-foreground">
                                        Voting Starts At
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={eventForm.starts_at}
                                        onChange={(e) =>
                                            setEventForm({
                                                ...eventForm,
                                                starts_at: e.target.value,
                                            })
                                        }
                                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-foreground">
                                        Voting Ends At
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={eventForm.ends_at}
                                        onChange={(e) =>
                                            setEventForm({
                                                ...eventForm,
                                                ends_at: e.target.value,
                                            })
                                        }
                                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-foreground">
                                    Reveal Date
                                </label>
                                <input
                                    type="date"
                                    value={eventForm.reveal_date}
                                    onChange={(e) =>
                                        setEventForm({
                                            ...eventForm,
                                            reveal_date: e.target.value,
                                        })
                                    }
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                />
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                    On and after this date, the winners' names, designation, area of assignment, and photo will be officially revealed in Tabulation Results.
                                </p>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-foreground">
                                        Status *
                                    </label>
                                    <select
                                        value={eventForm.status}
                                        onChange={(e) =>
                                            setEventForm({
                                                ...eventForm,
                                                status: e.target.value,
                                            })
                                        }
                                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                    >
                                        <option value="draft">Draft</option>
                                        <option value="scheduled">
                                            Scheduled
                                        </option>
                                        <option value="published">
                                            Published
                                        </option>
                                        <option value="closed">Closed</option>
                                        <option value="archived">
                                            Archived
                                        </option>
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-foreground">
                                        Results Visibility *
                                    </label>
                                    <select
                                        value={eventForm.results_visibility}
                                        onChange={(e) =>
                                            setEventForm({
                                                ...eventForm,
                                                results_visibility:
                                                    e.target.value,
                                            })
                                        }
                                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                    >
                                        <option value="after_closing">
                                            After Event Closes
                                        </option>
                                        <option value="public">
                                            Public (Always Visible)
                                        </option>
                                        <option value="voters_only">
                                            Voters Only (While Logged In)
                                        </option>
                                        <option value="hidden">
                                            Hidden from Voters
                                        </option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="modal_allow_vote_changes"
                                    checked={eventForm.allow_vote_changes}
                                    onChange={(e) =>
                                        setEventForm({
                                            ...eventForm,
                                            allow_vote_changes:
                                                e.target.checked,
                                        })
                                    }
                                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                                />
                                <label
                                    htmlFor="modal_allow_vote_changes"
                                    className="cursor-pointer text-xs font-medium text-foreground"
                                >
                                    Allow voters to change their votes before
                                    the voting period concludes
                                </label>
                            </div>

                            <div className="mt-6 flex items-center justify-end gap-3 border-t border-border/70 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsEditEventOpen(false)}
                                    className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                >
                                    {processing ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add / Edit Award Modal */}
            {(isAddAwardOpen || editingAward) && (
                <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200 fade-in">
                    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-border/70 pb-4">
                            <h2 className="text-lg font-bold text-foreground">
                                {editingAward
                                    ? 'Edit Award Category'
                                    : 'Add Award Category'}
                            </h2>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsAddAwardOpen(false);
                                    setEditingAward(null);
                                }}
                                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form
                            onSubmit={
                                editingAward
                                    ? handleUpdateAward
                                    : handleAddAward
                            }
                            className="mt-5 space-y-4"
                        >
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-foreground">
                                    Award Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Best Employee of the Year"
                                    value={awardForm.name}
                                    onChange={(e) =>
                                        setAwardForm({
                                            ...awardForm,
                                            name: e.target.value,
                                        })
                                    }
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-foreground">
                                    Description / Award Criteria
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="Describe the qualifications and merits for this recognition..."
                                    value={awardForm.description}
                                    onChange={(e) =>
                                        setAwardForm({
                                            ...awardForm,
                                            description: e.target.value,
                                        })
                                    }
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-foreground">
                                        Status *
                                    </label>
                                    <select
                                        value={awardForm.status}
                                        onChange={(e) =>
                                            setAwardForm({
                                                ...awardForm,
                                                status: e.target.value,
                                            })
                                        }
                                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">
                                            Inactive
                                        </option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-foreground">
                                        Display Order
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={awardForm.display_order}
                                        onChange={(e) =>
                                            setAwardForm({
                                                ...awardForm,
                                                display_order:
                                                    parseInt(e.target.value) ||
                                                    0,
                                            })
                                        }
                                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="mt-6 flex items-center justify-end gap-3 border-t border-border/70 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsAddAwardOpen(false);
                                        setEditingAward(null);
                                    }}
                                    className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                >
                                    {processing
                                        ? 'Saving...'
                                        : editingAward
                                          ? 'Update Award'
                                          : 'Add Award'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add / Edit Nominee Modal */}
            {(addingNomineeAward || editingNominee) && (
                <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200 fade-in">
                    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-border/70 pb-4">
                            <h2 className="text-lg font-bold text-foreground">
                                {editingNominee
                                    ? 'Edit Nominee'
                                    : `Add Nominee to "${addingNomineeAward?.name}"`}
                            </h2>
                            <button
                                type="button"
                                onClick={closeNomineeModal}
                                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {errors && Object.keys(errors).length > 0 && (
                            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
                                <ul className="list-inside list-disc space-y-0.5">
                                    {Object.entries(errors).map(([key, err]) => (
                                        <li key={key}>{err}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <form
                            onSubmit={
                                editingNominee
                                    ? handleUpdateNominee
                                    : handleAddNominee
                            }
                            className="mt-5 space-y-4"
                        >
                            {/* Nominee Photo Uploader */}
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-foreground">
                                    Nominee Photo
                                </label>
                                <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border bg-muted/20 p-4 sm:flex-row">
                                    <div className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-border bg-card shadow-sm">
                                        {nomineeForm.photo_preview ? (
                                            <img
                                                src={nomineeForm.photo_preview}
                                                alt="Nominee preview"
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <User className="h-12 w-12 text-muted-foreground/50" />
                                        )}
                                    </div>
                                    <div className="flex flex-1 flex-col gap-1.5 text-center sm:text-left">
                                        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                                            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
                                                <Camera className="h-3.5 w-3.5" />
                                                <span>
                                                    {nomineeForm.photo_preview
                                                        ? 'Change Photo'
                                                        : 'Upload Photo'}
                                                </span>
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept="image/png,image/jpeg,image/jpg,image/webp"
                                                    className="hidden"
                                                    onChange={handlePhotoChange}
                                                />
                                            </label>
                                            {nomineeForm.photo_preview && (
                                                <button
                                                    type="button"
                                                    onClick={
                                                        handleRemoveNomineePhoto
                                                    }
                                                    className="inline-flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/5 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-500/10"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                    Remove Photo
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-muted-foreground">
                                            PNG, JPG, or WEBP up to 5MB. Square
                                            photo recommended.
                                        </p>
                                        {errors?.photo && (
                                            <p className="text-xs font-semibold text-red-500">
                                                {errors.photo}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-foreground">
                                    Full Name or Nominee Title *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Eleanor Vance or Cloud Engineering Team"
                                    value={nomineeForm.name}
                                    onChange={(e) =>
                                        setNomineeForm({
                                            ...nomineeForm,
                                            name: e.target.value,
                                        })
                                    }
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-foreground">
                                        Designation
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Master Teacher I / Administrative Officer V"
                                        value={nomineeForm.department}
                                        onChange={(e) =>
                                            setNomineeForm({
                                                ...nomineeForm,
                                                department: e.target.value,
                                            })
                                        }
                                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-foreground">
                                        Area of Assignment
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Regional Office / Division of Cebu"
                                        value={nomineeForm.organization}
                                        onChange={(e) =>
                                            setNomineeForm({
                                                ...nomineeForm,
                                                organization: e.target.value,
                                            })
                                        }
                                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-foreground">
                                    Description / Accomplishments Summary
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="Notable projects, impact, leadership highlights..."
                                    value={nomineeForm.description}
                                    onChange={(e) =>
                                        setNomineeForm({
                                            ...nomineeForm,
                                            description: e.target.value,
                                        })
                                    }
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-foreground">
                                        Status *
                                    </label>
                                    <select
                                        value={nomineeForm.status}
                                        onChange={(e) =>
                                            setNomineeForm({
                                                ...nomineeForm,
                                                status: e.target.value,
                                            })
                                        }
                                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                    >
                                        <option value="active">
                                            Active (Eligible for votes)
                                        </option>
                                        <option value="inactive">
                                            Inactive
                                        </option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-foreground">
                                        Display Order
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={nomineeForm.display_order}
                                        onChange={(e) =>
                                            setNomineeForm({
                                                ...nomineeForm,
                                                display_order:
                                                    parseInt(e.target.value) ||
                                                    0,
                                            })
                                        }
                                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="mt-6 flex items-center justify-end gap-3 border-t border-border/70 pt-4">
                                <button
                                    type="button"
                                    onClick={closeNomineeModal}
                                    className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                >
                                    {processing
                                        ? 'Saving...'
                                        : editingNominee
                                          ? 'Update Nominee'
                                          : 'Save Nominee'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Authorized Voters Modal */}
            {isAddVotersOpen && (
                <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200 fade-in">
                    <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-card p-6 shadow-2xl">
                        <div className="flex items-start justify-between border-b border-border/70 pb-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-bold text-foreground">
                                        Add Authorized Voters
                                    </h2>
                                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600">
                                        Active Accounts (is_status = 1)
                                    </span>
                                </div>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    Select active registered accounts to grant
                                    voting eligibility for "{event.title}".
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAddVotersOpen(false)}
                                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="mt-4 flex flex-col gap-3">
                            <div className="relative">
                                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search active users by name, email, department, or position..."
                                    value={userModalSearch}
                                    onChange={(e) => {
                                        setUserModalSearch(e.target.value);
                                        setModalPage(1);
                                    }}
                                    className="w-full rounded-lg border border-border bg-background py-2 pr-4 pl-9 text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                />
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                                <div>
                                    Selected:{' '}
                                    <strong className="font-bold text-primary">
                                        {selectedUserIds.length}
                                    </strong>{' '}
                                    user(s) across all pages
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleSelectAllOnPage}
                                        className="font-semibold text-primary hover:underline"
                                    >
                                        Select Page
                                    </button>
                                    <span>•</span>
                                    <button
                                        type="button"
                                        onClick={handleDeselectAllOnPage}
                                        className="font-semibold text-muted-foreground hover:text-foreground hover:underline"
                                    >
                                        Deselect Page
                                    </button>
                                    <span>•</span>
                                    <button
                                        type="button"
                                        onClick={handleSelectAllFilteredUsers}
                                        className="font-semibold text-primary hover:underline"
                                    >
                                        Select All Matching ({modalTotalUsers})
                                    </button>
                                    <span>•</span>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedUserIds([])}
                                        className="font-semibold text-muted-foreground hover:text-foreground hover:underline"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                        </div>

                        <form
                            onSubmit={handleAddVotersSubmit}
                            className="mt-3 flex flex-1 flex-col overflow-hidden"
                        >
                            <div className="max-h-[360px] flex-1 divide-y divide-border/60 overflow-y-auto rounded-lg border border-border bg-background">
                                {paginatedCandidateUsers.length === 0 ? (
                                    <div className="p-8 text-center text-xs text-muted-foreground">
                                        No active users found matching your
                                        search.
                                    </div>
                                ) : (
                                    paginatedCandidateUsers.map((u) => {
                                        const isAlreadyEnrolled =
                                            alreadyEnrolledUserIds.has(u.id);
                                        const isSelected =
                                            selectedUserIds.includes(u.id);

                                        return (
                                            <div
                                                key={u.id}
                                                onClick={() => {
                                                    if (isAlreadyEnrolled)
                                                        return;
                                                    toggleUserSelection(u.id);
                                                }}
                                                className={`flex items-center justify-between p-3 text-xs transition-colors ${
                                                    isAlreadyEnrolled
                                                        ? 'cursor-not-allowed bg-muted/40 opacity-60'
                                                        : isSelected
                                                          ? 'cursor-pointer bg-primary/5 hover:bg-primary/10'
                                                          : 'cursor-pointer hover:bg-muted/50'
                                                }`}
                                            >
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            isSelected ||
                                                            isAlreadyEnrolled
                                                        }
                                                        disabled={
                                                            isAlreadyEnrolled
                                                        }
                                                        onChange={() => {}}
                                                        className="h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-primary/20"
                                                    />
                                                    <div className="min-w-0">
                                                        <p className="truncate font-semibold text-foreground">
                                                            {u.name}
                                                        </p>
                                                        <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                                                            <span className="truncate">
                                                                {u.email}
                                                            </span>
                                                            {u.department && (
                                                                <>
                                                                    <span>
                                                                        •
                                                                    </span>
                                                                    <span className="truncate">
                                                                        {
                                                                            u.department
                                                                        }
                                                                    </span>
                                                                </>
                                                            )}
                                                            {u.position && (
                                                                <>
                                                                    <span>
                                                                        •
                                                                    </span>
                                                                    <span className="truncate text-muted-foreground/80">
                                                                        {
                                                                            u.position
                                                                        }
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="ml-2 flex shrink-0 items-center gap-2">
                                                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground uppercase">
                                                        {u.role}
                                                    </span>
                                                    {isAlreadyEnrolled && (
                                                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                                                            Already Enrolled
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Pagination Controls Bar */}
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-3 text-xs text-muted-foreground">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span>
                                        Showing{' '}
                                        <strong className="text-foreground">
                                            {modalTotalUsers === 0
                                                ? 0
                                                : (safeModalPage - 1) *
                                                      modalPageSize +
                                                  1}
                                        </strong>
                                        –
                                        <strong className="text-foreground">
                                            {Math.min(
                                                safeModalPage * modalPageSize,
                                                modalTotalUsers,
                                            )}
                                        </strong>{' '}
                                        of{' '}
                                        <strong className="text-foreground">
                                            {modalTotalUsers}
                                        </strong>{' '}
                                        users
                                    </span>
                                    <span className="hidden sm:inline">•</span>
                                    <div className="flex items-center gap-1.5">
                                        <span>Per page:</span>
                                        <select
                                            value={modalPageSize}
                                            onChange={(e) => {
                                                setModalPageSize(
                                                    Number(e.target.value),
                                                );
                                                setModalPage(1);
                                            }}
                                            className="rounded border border-border bg-background px-2 py-0.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                                        >
                                            <option value={10}>10</option>
                                            <option value={15}>15</option>
                                            <option value={25}>25</option>
                                            <option value={50}>50</option>
                                            <option value={100}>100</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setModalPage(1)}
                                        disabled={safeModalPage <= 1}
                                        className="rounded border border-border p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                                        title="First Page"
                                    >
                                        <ChevronsLeft className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setModalPage((p) =>
                                                Math.max(1, p - 1),
                                            )
                                        }
                                        disabled={safeModalPage <= 1}
                                        className="rounded border border-border p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                                        title="Previous Page"
                                    >
                                        <ChevronLeft className="h-3.5 w-3.5" />
                                    </button>

                                    <div className="flex items-center gap-1 px-1">
                                        {Array.from(
                                            { length: modalTotalPages },
                                            (_, i) => i + 1,
                                        )
                                            .filter((page) => {
                                                return (
                                                    page === 1 ||
                                                    page === modalTotalPages ||
                                                    Math.abs(
                                                        page - safeModalPage,
                                                    ) <= 1
                                                );
                                            })
                                            .map((page, idx, arr) => {
                                                const prevPage = arr[idx - 1];
                                                const showEllipsis =
                                                    prevPage &&
                                                    page - prevPage > 1;

                                                return (
                                                    <div
                                                        key={page}
                                                        className="flex items-center gap-1"
                                                    >
                                                        {showEllipsis && (
                                                            <span className="px-1 text-muted-foreground">
                                                                ...
                                                            </span>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setModalPage(
                                                                    page,
                                                                )
                                                            }
                                                            className={`h-6 min-w-6 rounded px-1.5 text-xs font-semibold transition-colors ${
                                                                safeModalPage ===
                                                                page
                                                                    ? 'bg-primary text-primary-foreground'
                                                                    : 'border border-border text-foreground hover:bg-muted'
                                                            }`}
                                                        >
                                                            {page}
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setModalPage((p) =>
                                                Math.min(
                                                    modalTotalPages,
                                                    p + 1,
                                                ),
                                            )
                                        }
                                        disabled={
                                            safeModalPage >= modalTotalPages
                                        }
                                        className="rounded border border-border p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                                        title="Next Page"
                                    >
                                        <ChevronRight className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setModalPage(modalTotalPages)
                                        }
                                        disabled={
                                            safeModalPage >= modalTotalPages
                                        }
                                        className="rounded border border-border p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                                        title="Last Page"
                                    >
                                        <ChevronsRight className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>

                            <div className="mt-5 flex items-center justify-end gap-3 border-t border-border/70 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsAddVotersOpen(false)}
                                    className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={
                                        processing ||
                                        selectedUserIds.length === 0
                                    }
                                    className="rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                >
                                    {processing
                                        ? 'Authorizing...'
                                        : `Authorize Selected (${selectedUserIds.length})`}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Add / Edit Criterion Modal */}
            {(isAddCriterionOpen || editingCriterion) && (
                <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200 fade-in">
                    <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-border/70 pb-4">
                            <h2 className="text-lg font-bold text-foreground">
                                {editingCriterion
                                    ? 'Edit Evaluation Criterion'
                                    : `Add Evaluation Criterion for "${addingCriterionAward?.name}"`}
                            </h2>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsAddCriterionOpen(false);
                                    setEditingCriterion(null);
                                    setAddingCriterionAward(null);
                                }}
                                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form
                            onSubmit={editingCriterion ? handleUpdateCriterion : handleAddCriterion}
                            className="mt-5 space-y-4"
                        >
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-foreground">
                                    Criterion Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Exemplary Work Performance"
                                    value={criterionForm.name}
                                    onChange={(e) =>
                                        setCriterionForm({
                                            ...criterionForm,
                                            name: e.target.value,
                                        })
                                    }
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-foreground">
                                    Description / Rubric
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="Describe how voters should evaluate this criterion..."
                                    value={criterionForm.description}
                                    onChange={(e) =>
                                        setCriterionForm({
                                            ...criterionForm,
                                            description: e.target.value,
                                        })
                                    }
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-foreground">
                                        Max Score / Weight (%) *
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min={1}
                                        max={100}
                                        value={criterionForm.max_score}
                                        onChange={(e) =>
                                            setCriterionForm({
                                                ...criterionForm,
                                                max_score: parseFloat(e.target.value) || 0,
                                            })
                                        }
                                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                    />
                                    <p className="mt-1 text-[11px] text-muted-foreground">
                                        Max score a voter can give.
                                    </p>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-foreground">
                                        Display Order
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={criterionForm.display_order}
                                        onChange={(e) =>
                                            setCriterionForm({
                                                ...criterionForm,
                                                display_order: parseInt(e.target.value) || 1,
                                            })
                                        }
                                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="mt-6 flex items-center justify-end gap-3 border-t border-border/70 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsAddCriterionOpen(false);
                                        setEditingCriterion(null);
                                        setAddingCriterionAward(null);
                                    }}
                                    className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                >
                                    {processing ? 'Saving...' : editingCriterion ? 'Update Criterion' : 'Create Criterion'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
