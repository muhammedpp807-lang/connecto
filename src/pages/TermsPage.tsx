import React from 'react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { SEO } from '../components/common/SEO';

export const TermsPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <SEO title="Terms of Service – Connecto" description="Review the terms and conditions for using the Connecto messaging platform." />
      <Navbar />

      <main className="flex-1 pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto space-y-8 text-sm leading-relaxed">
        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight">Terms of Service</h1>
          <p className="text-xs text-slate-400">Effective Date: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="space-y-6 text-slate-600 dark:text-slate-300">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">1. Acceptance of Terms</h2>
            <p>
              By accessing and using Connecto, you agree to comply with and be bound by these terms of service.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">2. Acceptable Use</h2>
            <p>
              You agree not to use the service for transmitting abusive, malicious, or unauthorized content. Connecto reserves the right to suspend accounts violating safety policies.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};
