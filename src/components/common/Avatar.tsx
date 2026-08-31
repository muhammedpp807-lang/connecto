import React from 'react';
import { User } from 'lucide-react';

interface AvatarProps {
  src?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  isOnline?: boolean;
  showOnlineStatus?: boolean;
  className?: string;
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
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
    '2xl': 'w-24 h-24 text-2xl'
  };

  const iconSizeMap = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
    '2xl': 'w-12 h-12'
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
    : '';

  const [imgError, setImgError] = React.useState(false);

  // Reset img error if src changes
  React.useEffect(() => {
    setImgError(false);
  }, [src]);

  return (
    <div className={`relative inline-block flex-shrink-0 ${className}`}>
      <div
        className={`${sizeMap[size]} rounded-full overflow-hidden flex items-center justify-center font-bold text-white select-none bg-gradient-to-br from-slate-600 to-slate-700 dark:from-slate-700 dark:to-slate-800 shadow-xs border border-black/10 dark:border-white/10`}
      >
        {src && !imgError ? (
          <img
            src={src}
            alt={name || 'Avatar'}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : initials ? (
          <span className="tracking-tight select-none font-semibold">{initials}</span>
        ) : (
          <User className={`${iconSizeMap[size]} text-slate-300 dark:text-slate-400 stroke-[2]`} />
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

