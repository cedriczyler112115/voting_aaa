import type { ImgHTMLAttributes } from 'react';

export default function AppLogoIcon({
    className,
    alt = '4Ps AAA Voting Logo',
    ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <img
            src="/images/logo.png"
            alt={alt}
            className={`bg-transparent object-contain ${className ?? 'size-9'}`}
            {...props}
        />
    );
}
