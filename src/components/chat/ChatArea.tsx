import React, { useState, useEffect, useRef } from 'react';
import { Conversation, Message, UserProfile } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToMessages, markConversationAsRead, getLocalConversations } from '../../services/chatService';
import { ChatHeader } from './ChatHeader';
import { MessageBubble } from './MessageBubble';
import { MessageComposer } from './MessageComposer';
import { TypingIndicator } from './TypingIndicator';
import { ImageViewerModal } from './ImageViewerModal';
import { MediaEditorModal } from './MediaEditorModal';
import { formatMessageDateDivider } from '../../utils/dateUtils';
import { Logo } from '../common/Logo';
import { ShieldCheck, WifiOff, UploadCloud, Users, Sparkles } from 'lucide-react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useNotifications } from '../../contexts/NotificationContext';
import { useTheme } from '../../contexts/ThemeContext';
import { uploadMediaFile } from '../../services/storageService';
import { sendMessage } from '../../services/chatService';
import { playSentSound } from '../../utils/soundUtils';

interface ChatAreaProps {
  conversationId: string | null;
  recipient: UserProfile | null;
  conversation?: Conversation | null;
  onBackMobile: () => void;
  onLeaveGroup?: () => void;
}

interface DroppedMediaToEdit {
  file: File | Blob;
  previewUrl: string;
  mediaType: 'image' | 'video';
  fileName: string;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  conversationId,
  recipient,
  conversation: propConversation,
  onBackMobile,
  onLeaveGroup
}) => {
  const { profile } = useAuth();
  const { showToast, settings } = useNotifications();
  const { chatBackground, customChatWallpaper, chatWallpaperBlur, chatWallpaperBrightness } = useTheme();
  const isOnline = useNetworkStatus();

  const [messages, setMessages] = useState<Message[]>([]);
  const [activeImagePreview, setActiveImagePreview] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [droppedMediaToEdit, setDroppedMediaToEdit] = useState<DroppedMediaToEdit | null>(null);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(propConversation || null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Sync conversation data
  useEffect(() => {
    if (propConversation) {
      setCurrentConversation(propConversation);
    } else if (conversationId) {
      const convs = getLocalConversations();
      const match = convs.find((c) => c.id === conversationId);
      if (match) setCurrentConversation(match);
    }
  }, [conversationId, propConversation]);

  // Subscribe to messages in this conversation
  useEffect(() => {
    if (!conversationId || !profile) return;

    // Mark as read immediately
    markConversationAsRead(conversationId, profile.uid);

    const unsubscribe = subscribeToMessages(conversationId, (msgs) => {
      setMessages(msgs);
      // Mark as read when new incoming messages arrive
      markConversationAsRead(conversationId, profile.uid);
    });

    return () => unsubscribe();
  }, [conversationId, profile]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Drag & drop media files onto chat area
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (!conversationId || !profile) return;

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    if (file.size > 100 * 1024 * 1024) {
      showToast('error', 'File exceeds the maximum allowed size of 100MB.');
      return;
    }

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (isImage) {
      const reader = new FileReader();
      reader.onload = () => {
        setDroppedMediaToEdit({
          file,
          previewUrl: reader.result as string,
          mediaType: 'image',
          fileName: file.name
        });
      };
      reader.readAsDataURL(file);
      return;
    }

    if (isVideo) {
      const previewUrl = URL.createObjectURL(file);
      setDroppedMediaToEdit({
        file,
        previewUrl,
        mediaType: 'video',
        fileName: file.name
      });
      return;
    }

    // General non-media documents upload directly
    try {
      showToast('info', 'Uploading file...');
      const path = `chats/${conversationId}/files/${Date.now()}_${file.name}`;
      const url = await uploadMediaFile(path, file);

      await sendMessage(conversationId, profile.uid, recipient?.uid, {
        type: 'file',
        fileUrl: url,
        fileName: file.name,
        fileSize: file.size,
        senderName: profile.displayName,
        senderAvatar: profile.photoURL
      });

      if (settings.sounds) playSentSound();
      showToast('success', 'File sent!');
    } catch {
      showToast('error', 'Failed to upload document.');
    }
  };

  const handleDroppedMediaSend = async (
    editedBlob: Blob,
    caption: string,
    mediaType: 'image' | 'video',
    metadata: { fileName: string; duration?: number; size: number }
  ) => {
    if (!conversationId || !profile) return;
    try {
      const path =
        mediaType === 'image'
          ? `chats/${conversationId}/images/${Date.now()}_${metadata.fileName}`
          : `chats/${conversationId}/videos/${Date.now()}_${metadata.fileName}`;

      const url = await uploadMediaFile(path, editedBlob);

      await sendMessage(conversationId, profile.uid, recipient?.uid, {
        text: caption || undefined,
        type: mediaType,
        fileUrl: url,
        fileName: metadata.fileName,
        fileSize: metadata.size,
        videoDuration: metadata.duration,
        senderName: profile.displayName,
        senderAvatar: profile.photoURL
      });

      if (settings.sounds) playSentSound();
      showToast('success', `${mediaType === 'image' ? 'Image' : 'Video'} sent!`);
    } catch {
      showToast('error', `Failed to send ${mediaType}.`);
    } finally {
      setDroppedMediaToEdit(null);
    }
  };

  const handleGroupUpdated = () => {
    if (conversationId) {
      const convs = getLocalConversations();
      const match = convs.find((c) => c.id === conversationId);
      if (match) setCurrentConversation(match);
    }
  };

  // Empty state: No chat selected
  if (!conversationId || (!recipient && !currentConversation) || !profile) {
    return (
      <div className="flex-1 h-full hidden md:flex flex-col items-center justify-center p-8 bg-slate-50/50 dark:bg-[#0a0c12] text-center select-none">
        <div className="max-w-md space-y-6 flex flex-col items-center">
          <div className="p-4 rounded-3xl bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#1e2530] shadow-xl shadow-blue-500/5">
            <Logo size="lg" showText={false} />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Connecto Real-Time Messenger
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Select a conversation, start a direct message, or create a group chat with your contacts. Fast media sharing with photo & video editor enabled.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Cloud & Firestore synchronized</span>
          </div>
        </div>
      </div>
    );
  }

  const isGroup = currentConversation?.isGroup || (!recipient && Boolean(currentConversation?.groupName));
  let lastDateStr = '';

  return (
    <main
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex-1 h-full flex flex-col bg-slate-50/30 dark:bg-[#0a0c12] relative overflow-hidden transition-colors"
    >
      {/* Drag & Drop Visual Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-40 bg-blue-600/10 dark:bg-blue-500/20 backdrop-blur-xs border-4 border-dashed border-blue-500 flex flex-col items-center justify-center pointer-events-none animate-in fade-in">
          <div className="p-4 rounded-3xl bg-white dark:bg-[#161b22] shadow-2xl flex flex-col items-center gap-3">
            <UploadCloud className="w-12 h-12 text-blue-500 animate-bounce" />
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              Drop photo or video to preview & edit
            </p>
          </div>
        </div>
      )}

      {/* Dropped Media Editor Modal */}
      {droppedMediaToEdit && (
        <MediaEditorModal
          file={droppedMediaToEdit.file}
          previewUrl={droppedMediaToEdit.previewUrl}
          mediaType={droppedMediaToEdit.mediaType}
          fileName={droppedMediaToEdit.fileName}
          onSend={handleDroppedMediaSend}
          onClose={() => setDroppedMediaToEdit(null)}
        />
      )}

      {/* Offline Alert Strip */}
      {!isOnline && (
        <div className="bg-amber-500 text-slate-950 px-4 py-1.5 text-xs font-semibold flex items-center justify-center gap-2 z-30 animate-in slide-in-from-top">
          <WifiOff className="w-3.5 h-3.5" />
          <span>You are offline. Reconnecting to Connecto network...</span>
        </div>
      )}

      {/* Top Chat Header */}
      <ChatHeader
        conversation={currentConversation}
        recipient={recipient}
        currentUserId={profile.uid}
        currentUserName={profile.displayName}
        onBackMobile={onBackMobile}
        onGroupUpdated={handleGroupUpdated}
        onLeaveGroup={onLeaveGroup}
      />

      {/* Messages Scroll Area with customizable wallpaper */}
      <div
        ref={scrollContainerRef}
        style={
          customChatWallpaper
            ? {
                backgroundImage: `url(${customChatWallpaper})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: `blur(${chatWallpaperBlur}px) brightness(${chatWallpaperBrightness}%)`,
              }
            : undefined
        }
        className={`flex-1 overflow-y-auto p-4 sm:p-6 space-y-2 transition-colors relative ${
          customChatWallpaper
            ? ''
            : chatBackground === 'doodle'
            ? 'bg-[#e5ddd5] dark:bg-[#0d1418] bg-[radial-gradient(#9ca3af_1.5px,transparent_1.5px)] dark:bg-[radial-gradient(#374151_1.5px,transparent_1.5px)] [background-size:24px_24px]'
            : chatBackground === 'subtle_dots'
            ? 'bg-slate-100 dark:bg-[#12161f] bg-[radial-gradient(#64748b_1.2px,transparent_1.2px)] [background-size:16px_16px]'
            : chatBackground === 'dark_grid'
            ? 'bg-slate-900 text-white bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:2rem_2rem]'
            : chatBackground === 'warm_sunset'
            ? 'bg-gradient-to-b from-amber-50 to-rose-50 dark:from-amber-950/20 dark:to-rose-950/20'
            : chatBackground === 'emerald_mist'
            ? 'bg-gradient-to-b from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20'
            : chatBackground === 'midnight'
            ? 'bg-gradient-to-b from-slate-950 to-indigo-950 text-white'
            : chatBackground === 'cyber_neon'
            ? 'bg-slate-950 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:24px_24px] text-white'
            : chatBackground === 'starry_sky'
            ? 'bg-[#050814] bg-[radial-gradient(#818cf8_1px,transparent_1px)] [background-size:32px_32px] text-white'
            : 'bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px]'
        }`}
      >
        {/* Encryption Assurance Notice */}
        <div className="flex justify-center my-3">
          <div className="px-3.5 py-1 rounded-full bg-slate-200/60 dark:bg-[#161b22]/90 border border-slate-300/60 dark:border-[#1e2530] text-[11px] font-medium text-slate-600 dark:text-slate-400 shadow-xs text-center max-w-sm">
            {isGroup
              ? `🔒 Group "${currentConversation?.groupName}" with ${currentConversation?.participantIds?.length || 0} members.`
              : '🔒 Messages in this conversation are delivered in real time.'}
          </div>
        </div>

        {/* Message Stream */}
        {messages.map((msg) => {
          const dateStr = formatMessageDateDivider(msg.createdAt);
          const showDateDivider = dateStr !== lastDateStr;
          if (showDateDivider) {
            lastDateStr = dateStr;
          }

          const isMe = msg.senderId === profile.uid;

          return (
            <React.Fragment key={msg.id}>
              {showDateDivider && (
                <div className="flex justify-center my-4">
                  <span className="px-3 py-1 rounded-full bg-slate-200/80 dark:bg-[#161b22] border border-slate-300/80 dark:border-[#1e2530] text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400 shadow-xs">
                    {dateStr}
                  </span>
                </div>
              )}
              <MessageBubble
                message={msg}
                isMe={isMe}
                isGroup={isGroup}
                currentUserId={profile.uid}
                onImageClick={(url) => setActiveImagePreview(url)}
              />
            </React.Fragment>
          );
        })}

        {/* Real-time typing status */}
        {!isGroup && recipient && (
          <TypingIndicator
            conversationId={conversationId}
            recipientId={recipient.uid}
            recipientName={recipient.displayName}
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Message Composer */}
      <MessageComposer
        conversationId={conversationId}
        senderId={profile.uid}
        receiverId={recipient?.uid}
        senderName={profile.displayName}
        senderAvatar={profile.photoURL}
        isGroup={isGroup}
      />

      {/* Fullscreen Lightbox Image Viewer */}
      {activeImagePreview && (
        <ImageViewerModal
          imageUrl={activeImagePreview}
          onClose={() => setActiveImagePreview(null)}
        />
      )}
    </main>
  );
};

