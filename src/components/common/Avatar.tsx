import React from 'react';

interface AvatarProps {
  src?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  isOnline?: boolean;
  showOnlineStatus?: boolean;
  className?: string;
}

// Deterministic pastel background based on name
const AVATAR_BG_COLORS = [
  'bg-emerald-600 dark:bg-emerald-700',
  'bg-blue-600 dark:bg-blue-700',
  'bg-indigo-600 dark:bg-indigo-700',
  'bg-purple-600 dark:bg-purple-700',
  'bg-pink-600 dark:bg-pink-700',
  'bg-rose-600 dark:bg-rose-700',
  'bg-amber-600 dark:bg-amber-700',
  'bg-teal-600 dark:bg-teal-700',
  'bg-cyan-600 dark:bg-cyan-700'
];

function getAvatarBgColor(str: string): string {
  if (!str) return AVATAR_BG_COLORS[0];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % AVATAR_BG_COLORS.length;
  return AVATAR_BG_COLORS[idx];
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name = '',
  size = 'md',
  isOnline = false,
  showOnlineStatus = false,
  className = ''
}) => {
  const sizeMap = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
    '2xl': 'w-24 h-24 text-2xl'
  };

  const statusDotSize = {
    xs: 'w-2 h-2',
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-3.5 h-3.5',
    xl: 'w-4 h-4',
    '2xl': 'w-5 h-5'
  };

  const cleanName = name ? name.trim() : '';
  const initials = cleanName
    ? cleanName
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'U';

  const [imgError, setImgError] = React.useState(false);

  // Reset img error if src changes
  React.useEffect(() => {
    setImgError(false);
  }, [src]);

  const bgColorClass = getAvatarBgColor(cleanName);

  const cleanSrc = src && !src.includes('dicebear') && !src.includes('bottts') && !src.includes('robohash') ? src : undefined;

  return (
    <div className={`relative inline-block flex-shrink-0 ${className}`}>
      <div
        className={`${sizeMap[size]} rounded-full overflow-hidden flex items-center justify-center font-bold text-white select-none shadow-xs ${
          cleanSrc && !imgError ? 'bg-slate-300 dark:bg-[#202c33]' : bgColorClass
        }`}
      >
        {cleanSrc && !imgError ? (
          <img
            src={cleanSrc}
            alt={cleanName || 'Avatar'}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="tracking-tight select-none font-semibold uppercase">{initials}</span>
        )}
      </div>

      {showOnlineStatus && (
        <span
          className={`absolute bottom-0 right-0 ${statusDotSize[size]} rounded-full ring-2 ring-white dark:ring-[#111b21] ${
            isOnline ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-500'
          }`}
          title={isOnline ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
};

