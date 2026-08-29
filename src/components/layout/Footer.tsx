import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../common/Logo';
import { ShieldCheck, Heart, Github, Twitter, Globe } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Col */}
          <div className="space-y-4 md:col-span-1">
            <Logo size="md" />
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs">
              Connect. Chat. Share. A modern real-time communication platform engineered for fast, secure messaging across every screen.
            </p>
            <div className="inline-flex items-center gap-1 text-xs text-slate-500 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> Secure Cloud Infrastructure
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-4">
              Product
            </h4>
            <ul className="space-y-2.5 text-xs font-medium">
              <li><a href="/#features" className="hover:text-sky-600 dark:hover:text-sky-400 transition">Features</a></li>
              <li><a href="/#security" className="hover:text-sky-600 dark:hover:text-sky-400 transition">Security</a></li>
              <li><Link to="/app" className="hover:text-sky-600 dark:hover:text-sky-400 transition">Web Application</Link></li>
              <li><Link to="/admin" className="hover:text-sky-600 dark:hover:text-sky-400 transition">Admin Portal</Link></li>
            </ul>
          </div>

          {/* Company & Resources */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-4">
              Company
            </h4>
            <ul className="space-y-2.5 text-xs font-medium">
              <li><Link to="/about" className="hover:text-sky-600 dark:hover:text-sky-400 transition">About Connecto</Link></li>
              <li><Link to="/privacy" className="hover:text-sky-600 dark:hover:text-sky-400 transition">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-sky-600 dark:hover:text-sky-400 transition">Terms of Service</Link></li>
            </ul>
          </div>

          {/* Contact & Status */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-4">
              Community & Support
            </h4>
            <ul className="space-y-2.5 text-xs font-medium">
              <li><span className="text-slate-500 dark:text-slate-400">Support: support@connecto.app</span></li>
              <li className="flex items-center gap-2 pt-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">Systems Operational</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Connecto. All rights reserved. Original implementation.</p>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:underline">Privacy</Link>
            <Link to="/terms" className="hover:underline">Terms</Link>
            <Link to="/about" className="hover:underline">About</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
