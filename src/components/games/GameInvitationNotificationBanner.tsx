import React, { useState, useEffect } from 'react';
import { 
  Gamepad2, 
  Check, 
  X, 
  Clock, 
  Sparkles, 
  Loader2 
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  subscribeToGameInvitations, 
  respondToGameInvitation 
} from '../../services/gameService';
import { GameInvitation, GameSession } from '../../types';
import { Avatar } from '../common/Avatar';
import { playNotificationSound } from '../../utils/soundUtils';

interface GameInvitationNotificationBannerProps {
  onAcceptGame: (gameSession: GameSession) => void;
}

export const GameInvitationNotificationBanner: React.FC<GameInvitationNotificationBannerProps> = ({
  onAcceptGame
}) => {
  const { profile } = useAuth();
  const { settings, showToast } = useNotifications();
  const { colorConfig } = useTheme();

  const [incomingInv, setIncomingInv] = useState<GameInvitation | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!profile?.uid) return;

    const unsub = subscribeToGameInvitations(profile.uid, (invitations) => {
      const now = Date.now();
      // Find latest pending incoming invitation
      const pending = invitations.find(
        (i) => i.receiverId === profile.uid && i.status === 'pending' && i.expiresAt > now
      );

      if (pending) {
        if (!incomingInv || incomingInv.id !== pending.id) {
          if (settings.sounds) playNotificationSound();
        }
        setIncomingInv(pending);
        const rem = Math.max(0, Math.ceil((pending.expiresAt - now) / 1000));
        setSecondsLeft(rem);
      } else {
        setIncomingInv(null);
      }

      // Check if any outgoing invitation was declined
      const declined = invitations.find(
        (i) => i.senderId === profile.uid && i.status === 'declined' && now - i.createdAt < 8000
      );
      if (declined) {
        showToast('info', `${declined.receiverName || 'Friend'} declined your game invitation.`);
      }
    });

    return () => unsub();
  }, [profile?.uid, settings.sounds]);

  // Countdown timer effect
  useEffect(() => {
    if (!incomingInv) return;

    const timer = setInterval(() => {
      const rem = Math.max(0, Math.ceil((incomingInv.expiresAt - Date.now()) / 1000));
      setSecondsLeft(rem);
      if (rem <= 0) {
        setIncomingInv(null);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [incomingInv]);

  if (!incomingInv) return null;

  const handleAccept = async () => {
    if (!profile || isProcessing) return;
    setIsProcessing(true);
    try {
      const gameSession = await respondToGameInvitation(incomingInv.id, true, profile);
      if (gameSession) {
        showToast('success', `Game started with ${incomingInv.senderName}!`);
        onAcceptGame(gameSession);
      }
    } catch {
      showToast('error', 'Failed to accept invitation.');
    } finally {
      setIsProcessing(false);
      setIncomingInv(null);
    }
  };

  const handleDecline = async () => {
    if (!profile || isProcessing) return;
    setIsProcessing(true);
    try {
      await respondToGameInvitation(incomingInv.id, false, profile);
      showToast('info', 'Invitation declined.');
    } catch {} finally {
      setIsProcessing(false);
      setIncomingInv(null);
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md w-full px-3 animate-in slide-in-from-top-4 duration-300">
      <div className="p-4 rounded-3xl bg-white dark:bg-[#111b21] border-2 border-indigo-500/50 shadow-2xl backdrop-blur-md flex flex-col gap-3">
        {/* Top Info */}
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-wider">
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>Tic-Tac-Toe Challenge</span>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
            <Clock className="w-3 h-3" />
            <span>{secondsLeft}s left</span>
          </div>
        </div>

        {/* Sender details */}
        <div className="flex items-center gap-3">
          <Avatar
            src={incomingInv.senderAvatar}
            name={incomingInv.senderName}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">
              {incomingInv.senderName}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              invited you to play a match right now!
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleAccept}
            disabled={isProcessing}
            style={{ backgroundColor: colorConfig.primaryHex }}
            className="flex-1 py-2.5 px-4 rounded-xl text-white font-black text-xs flex items-center justify-center gap-2 shadow-md hover:opacity-95 active:scale-95 transition cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>Accept & Play</span>
          </button>

          <button
            type="button"
            onClick={handleDecline}
            disabled={isProcessing}
            className="py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-[#1f2c34] hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
            <span>Decline</span>
          </button>
        </div>
      </div>
    </div>
  );
};
