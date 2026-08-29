import React from 'react';
import { Trash2, Users, User, X, AlertTriangle } from 'lucide-react';
import { Message } from '../../types';

interface DeleteMessageModalProps {
  message: Message;
  isMe: boolean;
  onDeleteForEveryone: () => void;
  onDeleteForMe: () => void;
  onClose: () => void;
}

export const DeleteMessageModal: React.FC<DeleteMessageModalProps> = ({
  message,
  isMe,
  onDeleteForEveryone,
  onDeleteForMe,
  onClose
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div 
        className="w-full max-w-sm bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#1e2530] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-msg-title"
      >
        {/* Header */}
        <div className="p-5 pb-3 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 id="delete-msg-title" className="text-base font-bold text-slate-900 dark:text-white">
                {isMe ? 'Delete message?' : 'Delete message for me?'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isMe
                  ? 'Choose how you want to delete this message.'
                  : 'This message will only be removed from your view.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1e2530] transition"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message preview snippet */}
        <div className="px-5 py-2">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0d1117] border border-slate-200/80 dark:border-[#1e2530] text-xs text-slate-600 dark:text-slate-400 truncate italic">
            "{message.text || (message.type === 'image' ? 'Photo attachment' : message.type === 'video' ? 'Video attachment' : 'File attachment')}"
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-5 pt-3 space-y-2">
          {/* Delete for everyone (Only available for own messages) */}
          {isMe && (
            <button
              type="button"
              onClick={onDeleteForEveryone}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-bold text-sm shadow-md shadow-rose-600/20 transition cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>Delete for everyone</span>
            </button>
          )}

          {/* Delete for me */}
          <button
            type="button"
            onClick={onDeleteForMe}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm transition cursor-pointer ${
              isMe
                ? 'bg-slate-100 dark:bg-[#1f242c] hover:bg-slate-200 dark:hover:bg-[#282e38] text-slate-700 dark:text-slate-200'
                : 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Delete for me</span>
          </button>

          {/* Cancel */}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-2xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-[#1e2530] transition cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
