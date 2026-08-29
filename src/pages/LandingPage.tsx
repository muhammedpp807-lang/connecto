import React from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { SEO } from '../components/common/SEO';
import { 
  MessageSquare, 
  Zap, 
  ShieldCheck, 
  Smartphone, 
  Moon, 
  Lock, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  Radio, 
  Eye, 
  FileText 
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-sky-500 selection:text-white">
      <SEO
        title="Connecto – Modern Real-Time Messaging Platform"
        description="Connect. Chat. Share. Real-time messaging with instant delivery, read receipts, rich media sharing, and end-to-end cloud security."
      />
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full text-center flex flex-col items-center">
        {/* Release badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/80 text-xs font-semibold text-sky-700 dark:text-sky-300 mb-8 animate-in fade-in slide-in-from-top-4">
          <Sparkles className="w-4 h-4 text-sky-500" />
          <span>Connecto v2.4 • Next-Gen Realtime Messaging Engine</span>
        </div>

        {/* Hero Title & Tagline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 dark:text-white max-w-4xl leading-[1.1] mb-6">
          Connect. Chat. Share.{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-600 to-indigo-600">
            Without limits.
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed mb-10">
          Experience seamless one-to-one communication with real-time delivery status, rich file attachments, typing indicators, and reliable cloud storage.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Link
            to="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-base shadow-xl shadow-sky-600/20 hover:shadow-sky-600/30 transition transform hover:-translate-y-0.5 active:translate-y-0"
          >
            Start Chatting Free <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-base border border-slate-200 dark:border-slate-800 transition"
          >
            Sign In with Existing Account
          </Link>
        </div>

        {/* Interactive App Preview Mockup */}
        <div className="mt-16 sm:mt-20 w-full max-w-5xl rounded-3xl p-2 sm:p-3 bg-gradient-to-b from-slate-200/60 to-slate-100 dark:from-slate-800/80 dark:to-slate-900/40 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-inner flex flex-col md:flex-row h-[420px] sm:h-[480px]">
            {/* Sidebar Preview */}
            <div className="w-full md:w-80 border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-3 hidden sm:flex flex-col space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Conversations</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-900 text-left">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-900 dark:text-white">Connecto AI Assistant</span>
                  <span className="text-[10px] text-slate-400">Just now</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-1">
                  Welcome to Connecto! Try sending me a message.
                </p>
              </div>
              <div className="p-2.5 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-900 dark:text-white">Sarah Jenkins</span>
                  <span className="text-[10px] text-slate-400">45m</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-1">
                  The new responsive layout looks incredible! 🚀
                </p>
              </div>
            </div>

            {/* Chat Area Preview */}
            <div className="flex-1 flex flex-col justify-between p-4 sm:p-6 bg-white dark:bg-slate-900">
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-8 h-8 rounded-full bg-sky-500 text-white font-bold flex items-center justify-center text-xs">
                    CA
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Connecto AI Assistant</h4>
                    <span className="text-[10px] text-emerald-500 font-semibold">● Online</span>
                  </div>
                </div>

                {/* Bubbles */}
                <div className="flex justify-start">
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-xs px-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 max-w-sm text-left">
                    Hey! Welcome to the brand new Connecto platform. How can I help you?
                  </div>
                </div>

                <div className="flex justify-end">
                  <div className="bg-sky-600 text-white rounded-2xl rounded-br-xs px-4 py-2.5 text-xs max-w-sm text-left shadow-sm">
                    Testing the new real-time message sync! Looks blazing fast. ✨
                  </div>
                </div>
              </div>

              {/* Bottom input simulation */}
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-2 rounded-2xl">
                <span className="text-xs text-slate-400 px-3">Type a message...</span>
                <div className="ml-auto w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 bg-slate-50 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">
              Core Capabilities
            </h2>
            <h3 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Engineered for seamless conversation
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Every detail built with purpose to deliver lightning-fast speed, bulletproof reliability, and intuitive UX.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 hover:border-sky-500/50 transition">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">Real-Time Messaging</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Instant delivery with sub-second latency across tabs and devices. Stay synchronized everywhere.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 hover:border-sky-500/50 transition">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
                <Eye className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">Read Receipts & Status</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Know exactly when your messages are sent, delivered, and read with clean checkmark indicators.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 hover:border-sky-500/50 transition">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">Media & File Sharing</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Share high-resolution photos, documents, and attachments with built-in lightbox previews.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 hover:border-sky-500/50 transition">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                <Radio className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">Live Typing Indicators</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Interactive wave animation shows when participants are actively composing a reply.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 hover:border-sky-500/50 transition">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
                <Moon className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">Dark & Light Themes</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Full dynamic dark mode with system theme detection and manual toggle for late-night messaging.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 hover:border-sky-500/50 transition">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
                <Smartphone className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">Mobile-First PWA</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Responsive layout optimized for smartphones, tablets, and desktops with offline network detection.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Cloud Section */}
      <section id="security" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 text-white border border-slate-800 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl text-left z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800 text-xs font-semibold text-emerald-400">
              <ShieldCheck className="w-4 h-4" /> Enterprise Security
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Strict Access Controls & Privacy Defaults
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Every message and user document is protected with default-deny Firestore security rules. Only authenticated participants can read and send messages in their conversations.
            </p>
            <div className="flex flex-wrap gap-4 pt-2 text-xs font-semibold text-slate-300">
              <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Firebase Auth Integration</div>
              <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Granular RBAC Permissions</div>
              <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> PWA Manifest Certified</div>
            </div>
          </div>

          <div className="w-full md:w-auto z-10">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-lg transition"
            >
              Create Free Account <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
