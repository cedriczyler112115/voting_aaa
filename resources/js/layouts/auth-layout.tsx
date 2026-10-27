import AuthLayoutTemplate from '@/layouts/auth/auth-simple-layout';

export default function AuthLayout({
    title = '',
    description = '',
    children,
}: {
    title?: string;
    description?: string;
    children: React.ReactNode;
}) {
    const pageLayout = (children as any)?.type?.layout;
    const finalTitle =
        title || (typeof pageLayout === 'object' ? pageLayout?.title : '') || '';
    const finalDescription =
        description ||
        (typeof pageLayout === 'object' ? pageLayout?.description : '') ||
        '';

    return (
        <AuthLayoutTemplate title={finalTitle} description={finalDescription}>
            {children}
        </AuthLayoutTemplate>
    );
}
