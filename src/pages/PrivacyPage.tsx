import React from 'react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { SEO } from '../components/common/SEO';
import { ShieldCheck } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <SEO title="Privacy Policy – Connecto" description="Learn how Connecto respects and protects your messaging privacy and personal data." />
      <Navbar />

      <main className="flex-1 pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto space-y-8 text-sm leading-relaxed">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" /> Privacy First
          </div>
          <h1 className="text-3xl font-black tracking-tight">Privacy Policy</h1>
          <p className="text-xs text-slate-400">Effective Date: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="space-y-6 text-slate-600 dark:text-slate-300">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">1. Information We Collect</h2>
            <p>
              Connecto collects user account information (display name, username, and email address) strictly to facilitate authentic one-to-one communication between users.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">2. Messages & Media Storage</h2>
            <p>
              Your messages, files, and images are stored securely on Firestore and Cloud Storage with strict role-based access rules. Only members of a conversation can access its messages.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">3. Data Ownership & Export</h2>
            <p>
              You own all messages and files you upload. You can download a complete backup of your conversation history at any time from your account settings.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};
