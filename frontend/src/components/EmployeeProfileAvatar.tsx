import { useState } from 'react';
import { resolveUploadUrl } from '@/lib/upload-url';

type EmployeeProfileAvatarProps = {
  name: string;
  photoUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
};

export function EmployeeProfileAvatar({
  name,
  photoUrl,
  className = 'h-9 w-9',
  fallbackClassName = 'bg-[var(--brand-soft,#f0fdf4)] text-[var(--brand-primary,#0d5c3d)]',
}: EmployeeProfileAvatarProps) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const imageUrl = resolveUploadUrl(photoUrl);
  const imageFailed = failedImageUrl === imageUrl;
  const initial = name.trim().charAt(0).toUpperCase() || 'U';

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-xs ${fallbackClassName} ${className}`}
      aria-label={name}
    >
      {imageUrl && !imageFailed ? (
        <img
          src={imageUrl}
          alt={name}
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailedImageUrl(imageUrl)}
        />
      ) : (
        initial
      )}
    </div>
  );
}
