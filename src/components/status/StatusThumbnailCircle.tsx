import React from 'react';
import { StatusItem } from '../../types';
import { Play, FileText } from 'lucide-react';
import { Avatar } from '../common/Avatar';

interface StatusThumbnailCircleProps {
  status?: StatusItem | null;
  userAvatar?: string;
  userName?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'w-10 h-10',
  md: 'w-12 h-12',
  lg: 'w-14 h-14',
  xl: 'w-16 h-16'
};

export const StatusThumbnailCircle: React.FC<StatusThumbnailCircleProps> = ({
  status,
  userAvatar,
  userName = 'User',
  size = 'md',
  className = ''
}) => {
  const [imgError, setImgError] = React.useState(false);
  const sizeClass = SIZE_CLASSES[size];

  // If there's an active status with media or text
  if (status) {
    // 1. Photo or Video with thumbnail / mediaUrl
    const mediaSrc = status.thumbnailUrl || (status.type === 'image' ? status.mediaUrl : '');
    
    if (mediaSrc && !imgError) {
      return (
        <div className={`relative ${sizeClass} rounded-full overflow-hidden flex-shrink-0 bg-slate-900 shadow-xs ${className}`}>
          <img
            src={mediaSrc}
            alt={status.caption || 'Status'}
            onError={() => setImgError(true)}
            className={`w-full h-full object-cover ${status.filter || ''}`}
            loading="lazy"
          />
          {status.type === 'video' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Play className="w-3.5 h-3.5 text-white fill-white drop-shadow-md" />
            </div>
          )}
        </div>
      );
    }

    // 2. Video without extracted thumbnail (fallback directly to video poster or inline video frame)
    if (status.type === 'video' && status.mediaUrl && !imgError) {
      return (
        <div className={`relative ${sizeClass} rounded-full overflow-hidden flex-shrink-0 bg-slate-950 shadow-xs ${className}`}>
          <video
            src={status.mediaUrl}
            className="w-full h-full object-cover pointer-events-none"
            muted
            preload="metadata"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Play className="w-3.5 h-3.5 text-white fill-white drop-shadow-md" />
          </div>
        </div>
      );
    }

    // 3. Text Status with styled colorful background
    if (status.type === 'text') {
      const bg = status.textBackground || 'bg-gradient-to-tr from-emerald-600 to-teal-700';
      const textPreview = status.caption ? status.caption.trim().slice(0, 8) : 'Status';

      return (
        <div className={`relative ${sizeClass} rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center p-1 shadow-xs ${bg} ${className}`}>
          <span className="text-[9px] font-bold text-white text-center line-clamp-1 leading-tight select-none px-0.5">
            {textPreview}
          </span>
        </div>
      );
    }
  }

  // 4. Default fallback: Clean User Profile Initials or Uploaded Photo
  return (
    <Avatar
      src={userAvatar}
      name={userName}
      size={size === 'xl' ? 'xl' : size === 'lg' ? 'lg' : size === 'sm' ? 'sm' : 'md'}
      className={className}
    />
  );
};
