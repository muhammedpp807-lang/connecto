import React, { useState, useRef, useEffect } from 'react';
import {
  Check,
  CheckCheck,
  FileText,
  Download,
  Smile,
  Trash2,
  Ban,
  MoreVertical,
  Reply,
  Sparkles,
  Copy
} from 'lucide-react';
import { Message } from '../../types';
import { formatTime, formatFileSize } from '../../utils/dateUtils';
import { addMessageReaction, deleteMessageForEveryone, deleteMessageForMe } from '../../services/chatService';
import { DeleteMessageModal } from './DeleteMessageModal';
import { AudioMessagePlayer } from './AudioMessagePlayer';
import { useNotifications } from '../../contexts/NotificationContext';
import { useTheme } from '../../contexts/ThemeContext';

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
  isGroup?: boolean;
  currentUserId: string;
  onImageClick?: (url: string) => void;
  onReply?: (message: Message) => void;
  onReplySticker?: (message: Message) => void;
  onDeleteMessageLocally?: (messageId: string) => void;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🔥', '🎉', '🙏'];

// Deterministic color mapping for sender names in group chats
const SENDER_COLORS萃 = [
  'text-emerald-500 dark:text-emerald-400',
  'text-amber-500 dark:text-amber-400',
  'text-indigo-500 dark:text-indigo-400',
  'text-rose-500 dark:text-rose-400',
  'text-cyan-500 dark:text-cyan-400',
  'text-purple-500 dark:text-purple-400',
  'text-teal-500 dark:text-teal-400',
  'text-orange-500 dark:text-orange-400'
];

function getSenderColor(name?: string): string {
  if (!name) return SENDER_COLORS萃[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx不易 = Math.abs(hash) % SENDER_COLORS萃.length;
  return SENDER_COLORS萃[idx不易];
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isMe,
  isGroup,
  currentUserId,
  onImageClick,
  onReply,
  onReplySticker,
  onDeleteMessageLocally
}) => {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { showToast } = useNotifications();
  const { bubbleSettings, colorConfig } = useTheme();

  // Close menu when clicked outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showMenu]);

  // If deleted for current user only, hide completely
  if (message.deletedForUsers && message.deletedForUsers.includes(currentUserId)) {
    return null;
  }

  // System notification message layout
  if (message.type === 'system') {
    return (
      <div className="flex justify-center my-2.5 px-4 animate-in fade-in">
        <span className="px-3.5 py-1 rounded-full bg-slate-200/80 dark:bg-[#161b22]/90 border border-slate-300/60 dark:border-[#1e2530] text-[11px] font-medium text-slate-600 dark:text-slate-400 shadow-xs text-center">
          {message.text}
        </span>
      </div>
    );
  }

  const handleReaction = async (emoji: string) => {
    await addMessageReaction(message.conversationId, message.id, currentUserId, emoji);
    setShowReactionPicker(false);
  };

  const handleDeleteForEveryone = async () => {
    try {
      onDeleteMessageLocally?.(message.id);
      await deleteMessageForEveryone(message.conversationId, message.id);
      setShowDeleteModal(false);
      showToast('info', 'Message deleted for everyone');
    } catch {
      showToast('error', 'Failed to delete message');
    }
  };

  const handleDeleteForMe = async () => {
    try {
      onDeleteMessageLocally?.(message.id);
      await deleteMessageForMe(message.conversationId, message.id, currentUserId);
      setShowDeleteModal(false);
      showToast('info', 'Message deleted for you');
    } catch {
      showToast('error', 'Failed to delete message');
    }
  };

  const handleCopy = () => {
    if (message.text) {
      navigator.clipboard.writeText(message.text);
      showToast('success', 'Copied text to clipboard');
    }
    setShowMenu(false);
  };

  const senderColor = getSenderColor(message.senderName);

  // Compute bubble corner radius class
  const getRadiusClass = () => {
    switch (bubbleSettings.radius) {
      case 'sharp':
        return 'rounded-none';
      case 'subtle':
        return isMe ? 'rounded-lg rounded-tr-none' : 'rounded-lg rounded-tl-none';
      case 'extra-round':
        return isMe ? 'rounded-3xl rounded-tr-none' : 'rounded-3xl rounded-tl-none';
      case 'pill':
        return isMe ? 'rounded-[28px] rounded-tr-none' : 'rounded-[28px] rounded-tl-none';
      case 'rounded':
      default:
        return isMe ? 'rounded-2xl rounded-tr-none' : 'rounded-2xl rounded-tl-none';
    }
  };

  // Compute font size class
  const getFontSizeClass = () => {
    switch (bubbleSettings.fontSize) {
      case 'small':
        return 'text-xs leading-relaxed';
      case 'large':
        return 'text-base leading-relaxed';
      case 'extra-large':
        return 'text-lg leading-relaxed';
      case 'medium':
      default:
        return 'text-sm leading-relaxed';
    }
  };

  // Compute outgoing bubble color scheme
  const getOutgoingColorClass = () => {
    switch (bubbleSettings.colorScheme) {
      case 'emerald':
        return 'bg-[#008069] dark:bg-[#005c4b] text-white shadow-emerald-950/20';
      case 'blue':
        return 'bg-blue-600 dark:bg-blue-600 text-white shadow-blue-950/20';
      case 'purple':
        return 'bg-purple-600 dark:bg-purple-600 text-white shadow-purple-950/20';
      case 'midnight':
        return 'bg-slate-900 dark:bg-[#12161f] text-white border border-slate-700/60';
      case 'sunset':
        return 'bg-gradient-to-r from-rose-500 to-amber-500 text-white';
      case 'cyber':
        return 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white';
      case 'monochrome':
        return 'bg-slate-800 dark:bg-slate-700 text-white';
      case 'theme':
      default:
        return `${colorConfig.bgClass} text-white ${colorConfig.glowClass}`;
    }
  };

  const bubbleRadiusClass = getRadiusClass();
  const fontSizeClass = getFontSizeClass();
  const outgoingColorClass = getOutgoingColorClass();
  const opacityStyle = bubbleSettings.bubbleOpacity < 100 
    ? { opacity: bubbleSettings.bubbleOpacity / 100 } 
    : undefined;

  // Deleted For Everyone Message View (WhatsApp style)
  if (message.deletedForEveryone) {
    return (
      <div
        className={`group relative flex flex-col ${isMe ? 'items-end' : 'items-start'} my-1 px-2`}
        id={`msg-bubble-${message.id}`}
      >
        <div
          className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs italic ${
            isMe
              ? 'bg-emerald-600/20 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-200 border border-emerald-300/40 dark:border-emerald-800/40 rounded-tr-none'
              : 'bg-slate-100 dark:bg-[#161b22]/70 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-[#1e2530] rounded-tl-none'
          }`}
        >
          <Ban className="w-3.5 h-3.5 opacity-70 flex-shrink-0" />
          <span>{isMe ? 'You deleted this message' : 'This message was deleted'}</span>
          <span className="text-[10px] opacity-60 ml-1.5 not-italic">
            {formatTime(message.createdAt)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group relative flex flex-col ${isMe ? 'items-end' : 'items-start'} ${bubbleSettings.densePadding ? 'my-0.5' : 'my-1.5'} px-2`}
      id={`msg-bubble-${message.id}`}
    >
      {/* Quick Reaction Bar */}
      {showReactionPicker && (
        <div
          className={`absolute -top-9 ${isMe ? 'right-2' : 'left-2'} z-30 flex items-center gap-1 bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#1e2530] px-2 py-1 rounded-full shadow-xl animate-in fade-in zoom-in-95`}
        >
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className="hover:scale-125 transition transform p-1 text-sm cursor-pointer"
              title={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeleteMessageModal
          message={message}
          isMe={isMe}
          onDeleteForEveryone={handleDeleteForEveryone}
          onDeleteForMe={handleDeleteForMe}
          onClose={() => setShowDeleteModal(false)}
        />
      )}

      {/* Bubble Container - Sleek Medium Size */}
      <div
        style={opacityStyle}
        className={`relative w-fit max-w-[85%] sm:max-w-[340px] md:max-w-[420px] min-w-[100px] break-words [overflow-wrap:anywhere] ${
          bubbleSettings.densePadding ? 'px-3 py-1.5' : 'px-3.5 py-2'
        } ${bubbleRadiusClass} pr-7 sm:pr-8 shadow-xs transition-all duration-150 ${
          isMe
            ? `${outgoingColorClass} shadow-md`
            : 'bg-white dark:bg-[#161b22] text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-[#1e2530] shadow-xs'
        }`}
      >
        {/* Top Right Three-Dots Dropdown Trigger */}
        <div className="absolute top-1.5 right-1.5 z-20" ref={menuRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className={`p-1 rounded-full transition cursor-pointer opacity-70 hover:opacity-100 ${
              isMe
                ? 'text-white hover:bg-black/20'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1e2530]'
            }`}
            title="Message options"
            aria-label="Message options"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {/* Dropdown Menu Modal/Popover */}
          {showMenu && (
            <div
              className={`absolute top-full mt-1 ${isMe ? 'right-0' : 'left-0'} z-50 w-44 bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#1e2530] rounded-2xl shadow-2xl py-1 text-xs animate-in fade-in zoom-in-95 backdrop-blur-md`}
            >
              {/* 1. Reply */}
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onReply?.(message);
                }}
                className="w-full px-3 py-2 text-left flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1e2530] transition cursor-pointer font-medium"
              >
                <Reply className="w-3.5 h-3.5 text-emerald-500" />
                <span>Reply</span>
              </button>

              {/* 2. Reply with Sticker */}
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onReplySticker?.(message);
                }}
                className="w-full px-3 py-2 text-left flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1e2530] transition cursor-pointer font-medium"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                <span>Reply with Sticker</span>
              </button>

              {/* 3. React with Emoji */}
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  setShowReactionPicker(true);
                }}
                className="w-full px-3 py-2 text-left flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1e2530] transition cursor-pointer font-medium"
              >
                <Smile className="w-3.5 h-3.5 text-amber-500" />
                <span>React</span>
              </button>

              {/* 4. Copy Text (if text exists) */}
              {message.text && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="w-full px-3 py-2 text-left flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1e2530] transition cursor-pointer font-medium"
                >
                  <Copy className="w-3.5 h-3.5 text-blue-500" />
                  <span>Copy Text</span>
                </button>
              )}

              <div className="h-px bg-slate-100 dark:bg-[#1e2530] my-1" />

              {/* 5. Delete Message */}
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  setShowDeleteModal(true);
                }}
                className="w-full px-3 py-2 text-left flex items-center gap-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>

        {/* In group chats, display sender name for incoming messages */}
        {isGroup && !isMe && message.senderName && (
          <p className={`text-[11px] font-bold mb-1 tracking-tight ${senderColor}`}>
            {message.senderName}
          </p>
        )}

        {/* Sleek WhatsApp-style Quote Block (Image 7) */}
        {message.replyTo && (
          <div
            className={`mb-1.5 px-2.5 py-1 rounded-md border-l-2 text-xs select-none ${
              isMe
                ? 'bg-black/25 border-emerald-300 text-white/90'
                : 'bg-slate-100/90 dark:bg-black/35 border-emerald-500 text-slate-800 dark:text-slate-200'
            }`}
          >
            <p className={`font-semibold text-[11px] truncate ${isMe ? 'text-emerald-200' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {message.replyTo.senderName || 'Message'}
            </p>
            <p className="text-[11px] opacity-80 truncate line-clamp-1 max-w-[260px]">
              {message.replyTo.text ||
                (message.replyTo.type === 'image'
                  ? '📷 Photo'
                  : message.replyTo.type === 'video'
                  ? '🎥 Video'
                  : message.replyTo.type === 'sticker'
                  ? '🎨 Sticker'
                  : 'Attachment')}
            </p>
          </div>
        )}

        {/* Sticker Message Layout */}
        {message.type === 'sticker' && (
          <div className="my-1 py-1 flex items-center justify-center select-none">
            <span className="text-5xl sm:text-6xl transform hover:scale-110 transition duration-150 filter drop-shadow-md cursor-pointer">
              {message.text || '✨'}
            </span>
          </div>
        )}

        {/* Image Content */}
        {message.type === 'image' && message.fileUrl && (
          <div className="rounded-xl overflow-hidden my-1 bg-black/5 cursor-pointer max-w-sm">
            <img
              src={message.fileUrl}
              alt={message.text || 'Photo'}
              onClick={() => onImageClick?.(message.fileUrl!)}
              className="max-h-72 w-full object-cover hover:opacity-95 transition rounded-xl"
              loading="lazy"
            />
          </div>
        )}

        {/* Video Content */}
        {message.type === 'video' && message.fileUrl && (
          <div className="rounded-xl overflow-hidden my-1 bg-black max-w-sm shadow-md">
            <video
              src={message.fileUrl}
              controls
              playsInline
              preload="metadata"
              className="max-h-72 w-full object-contain rounded-xl"
            />
          </div>
        )}

        {/* Audio / Voice Note Content */}
        {message.type === 'audio' && (
          <AudioMessagePlayer
            audioUrl={message.fileUrl}
            duration={message.audioDuration}
            waveform={message.audioWaveform}
            isMe={isMe}
          />
        )}

        {/* Text Content (or caption) */}
        {message.type !== 'sticker' && message.text && (
          <p className={`${fontSizeClass} whitespace-pre-wrap break-words`}>
            {message.text}
          </p>
        )}

        {/* File Content */}
        {message.type === 'file' && message.fileUrl && (
          <div
            className={`flex items-center gap-3 p-2.5 rounded-xl my-1 border ${
              isMe 
                ? 'bg-white/10 border-white/20 text-white' 
                : 'bg-slate-50 dark:bg-[#0d1117] border-slate-200 dark:border-[#1e2530]'
            }`}
          >
            <div className={`p-2 rounded-lg ${isMe ? 'bg-white/20' : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'}`}>
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{message.fileName || 'Attachment'}</p>
              <p className={`text-[10px] ${isMe ? 'text-white/80' : 'text-slate-400'}`}>
                {formatFileSize(message.fileSize)}
              </p>
            </div>
            <a
              href={message.fileUrl}
              download={message.fileName || 'file'}
              target="_blank"
              rel="noopener noreferrer"
              className={`p-1.5 rounded-lg transition ${
                isMe ? 'hover:bg-white/20 text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
              }`}
              title="Download file"
              aria-label="Download file"
            >
              <Download className="w-4 h-4" />
            </a>
          </div>
        )}

        {/* Metadata Footer: Timestamp & Read Status */}
        <div
          className={`flex items-center justify-end gap-1.5 mt-1 text-[10px] ${
            isMe ? 'text-white/80' : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          <span>{formatTime(message.createdAt)}</span>
          {isMe && (
            <span className="flex items-center" title={message.read ? "Read" : message.delivered ? "Delivered" : "Sent"}>
              {message.read ? (
                <CheckCheck className="w-3.5 h-3.5 text-emerald-200" />
              ) : message.delivered ? (
                <CheckCheck className="w-3.5 h-3.5 text-white/90" />
              ) : (
                <Check className="w-3.5 h-3.5 text-white/90" />
              )}
            </span>
          )}
        </div>
      </div>

      {/* Message Reactions Badges (Image 4) */}
      {message.reactions && Object.keys(message.reactions).length > 0 && (
        <div className={`flex flex-wrap items-center gap-1.5 mt-0.5 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
          {Object.entries(
            Object.values(message.reactions as Record<string, string>).reduce((acc: Record<string, number>, emoji: string) => {
              acc[emoji] = (acc[emoji] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)
          ).map(([emoji, count]) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleReaction(emoji)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-900/90 dark:bg-[#161f2e] border border-slate-700/60 dark:border-[#2d3a4f] text-slate-200 shadow-md hover:scale-105 transition cursor-pointer select-none"
              title={`Reacted with ${emoji}`}
            >
              <span className="text-sm leading-none">{emoji}</span>
              <span className="text-[11px] font-semibold text-slate-300">{count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
