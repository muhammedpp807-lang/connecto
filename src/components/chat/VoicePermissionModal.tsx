import React, { useState } from 'react';
import { 
  Mic, 
  X, 
  ExternalLink, 
  Volume2, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface VoicePermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestPermission: () => Promise<boolean>;
  onStartSimulatedVoice: () => void;
}

export const VoicePermissionModal: React.FC<VoicePermissionModalProps> = ({
  isOpen,
  onClose,
  onRequestPermission,
  onStartSimulatedVoice
}) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGrantAccess = async () => {
    setIsRequesting(true);
    setErrorNotice(null);
    try {
      const success = await onRequestPermission();
      if (success) {
        onClose();
      } else {
        setErrorNotice(
          'Microphone permission is still blocked by your browser settings. Follow the instructions below to enable it.'
        );
      }
    } catch {
      setErrorNotice(
        'Could not access microphone hardware. You can enable it in browser settings or use the Simulated Voice Recorder below.'
      );
    } finally {
      setIsRequesting(false);
    }
  };

  const handleOpenNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 select-none">
      <div className="bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#1e2530] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner">
              <Mic className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Allow Microphone & Voice Access
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Required to record and send voice notes
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#0d1117] transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative Message Card */}
        <div className="bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#1e2530] rounded-2xl p-4 space-y-3">
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
            To record high-definition voice messages with live waveform visualization, Connecto needs permission to access your microphone.
          </p>

          <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-[#1e2530] text-[11px] text-slate-600 dark:text-slate-400">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
              <span>1. Click <strong>&quot;Allow Microphone Access&quot;</strong> below and click <strong>Allow</strong> in the browser prompt.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
              <span>2. If blocked, click the <strong>Lock (🔒) / Settings</strong> icon in the address bar and switch Microphone to <strong>Allow</strong>.</span>
            </div>
          </div>
        </div>

        {/* Error notification if blocked */}
        {errorNotice && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl flex items-start gap-2.5 text-amber-800 dark:text-amber-300 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="leading-snug">{errorNotice}</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            onClick={handleGrantAccess}
            disabled={isRequesting}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-900/20 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            {isRequesting ? 'Requesting Permission...' : 'Allow Microphone Access'}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onStartSimulatedVoice();
              }}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-[#0d1117] hover:bg-slate-200 dark:hover:bg-[#1f2632] border border-slate-200 dark:border-[#1e2530] text-slate-800 dark:text-slate-200 text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
              title="Test voice recording with audio synthesizer simulation"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Use Simulated Voice</span>
            </button>

            <button
              type="button"
              onClick={handleOpenNewTab}
              className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-[#0d1117] hover:bg-slate-200 dark:hover:bg-[#1f2632] border border-slate-200 dark:border-[#1e2530] text-slate-700 dark:text-slate-300 text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
              title="Open in new window for direct hardware access"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in Tab</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
