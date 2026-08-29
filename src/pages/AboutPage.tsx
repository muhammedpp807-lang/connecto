import React from 'react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { SEO } from '../components/common/SEO';
import { Logo } from '../components/common/Logo';
import { ShieldCheck, Zap, Heart, MessageSquare, Award, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <SEO
        title="About Connecto – The Real-Time Communication Platform"
        description="Learn about Connecto's mission to provide fast, privacy-first, cloud-synchronized real-time messaging."
      />
      <Navbar />

      <main className="flex-1 pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <Logo size="lg" className="justify-center mb-2" />
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
            Built for modern conversations
          </h1>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Connecto is an original, production-grade messaging platform designed from the ground up for speed, delightful interactions, and dependable privacy.
          </p>
        </div>

        {/* Values */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950 text-sky-600 inline-block">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold">Sub-Second Sync</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Every message and status tick is synchronized seamlessly using real-time listeners and multi-tab broadcasting.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 inline-block">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold">Default-Deny Security</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Built on strict Firestore security rules preventing unauthorized reads, writes, and metadata spoofing.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950 text-purple-600 inline-block">
              <Heart className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold">Crafted UX</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Refined animations, custom Web Audio chimes, dark theme support, and responsive layouts for all viewports.
            </p>
          </div>
        </div>

        {/* Tech Stack */}
        <div className="bg-slate-50 dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
          <h2 className="text-lg font-bold">Architecture & Tech Stack</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Frontend</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">React 19 & TypeScript</span>
            </div>
            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Styling</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">Tailwind CSS v4</span>
            </div>
            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Database</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">Firebase Firestore</span>
            </div>
            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Auth & Media</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">Firebase Auth & Storage</span>
            </div>
          </div>
        </div>

        <div className="text-center pt-6">
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-md transition"
          >
            <MessageSquare className="w-4 h-4" /> Get Started with Connecto
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
};
