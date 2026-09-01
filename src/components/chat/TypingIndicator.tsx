import React, { useEffect, useState } from 'react';
import { db, isFirebaseConfigured } from '../../firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';
import { isFirestoreQuotaExhausted, handleFirestoreError } from '../../services/storageEngine';

interface TypingIndicatorProps {
  conversationId: string;
  recipientId: string;
  recipientName?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  conversationId,
  recipientId,
  recipientName = 'Recipient'
}) => {
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!conversationId || !recipientId) return;

    let unsubscribe: (() => void) | null = null;

    if (isFirebaseConfigured && db && !isFirestoreQuotaExhausted()) {
      try {
        const convRef = doc(db, 'conversations', conversationId);
        unsubscribe = onSnapshot(
          convRef, 
          (snap) => {
            if (snap.exists()) {
              const data = snap.data();
              const typingState = Boolean(data.typingUsers?.[recipientId]);
              setIsTyping(typingState);
            }
          },
          (err) => {
            handleFirestoreError(err);
          }
        );
      } catch (err) {
        handleFirestoreError(err);
      }
    }

    // Local storage check
    const checkLocalTyping = () => {
      try {
        const raw = localStorage.getItem('connecto_db_conversations');
        if (raw) {
          const parsed = JSON.parse(raw);
          const conv = parsed.find((c: { id: string }) => c.id === conversationId);
          setIsTyping(Boolean(conv?.typingUsers?.[recipientId]));
        }
      } catch {
        // ignore
      }
    };

    checkLocalTyping();
    const interval = setInterval(checkLocalTyping, 1000);
    window.addEventListener('storage', checkLocalTyping);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', checkLocalTyping);
    };
  }, [conversationId, recipientId]);

  if (!isTyping) return null;

  return (
    <div className="px-6 py-2 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-1">
      <div className="flex items-center gap-1.5 bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#1e2530] px-3.5 py-1.5 rounded-full shadow-xs">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {recipientName} is typing
        </span>
        <div className="flex items-center gap-1 ml-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.15s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" />
        </div>
      </div>
    </div>
  );
};
