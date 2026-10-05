import React from 'react';
import { Bot, Sparkles, History, UserCheck, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  currentView: 'profile' | 'interview' | 'report' | 'history';
  onNavigate: (view: 'profile' | 'interview' | 'report' | 'history') => void;
  hasActiveSession: boolean;
  hasReport: boolean;
  aiStatus?: { healthy: boolean; provider: string };
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  hasActiveSession,
  hasReport,
  aiStatus,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div
          onClick={() => onNavigate('profile')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-teal-400 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-brand-500 bg-clip-text text-transparent">
                VAANI™
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-500 border border-brand-500/20">
                v1.0 Adaptive
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium hidden sm:block">
              AI Interview & Assessment Intelligence
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => onNavigate('profile')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all ${
              currentView === 'profile'
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Profile</span>
          </button>

          {hasActiveSession && (
            <button
              onClick={() => onNavigate('interview')}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all ${
                currentView === 'interview'
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>Live Interview</span>
            </button>
          )}

          {hasReport && (
            <button
              onClick={() => onNavigate('report')}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all ${
                currentView === 'report'
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <span>Assessment Report</span>
            </button>
          )}

          <button
            onClick={() => onNavigate('history')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all ${
              currentView === 'history'
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Archive</span>
          </button>
        </nav>

        {/* Status Indicator */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-850 border border-slate-700/60 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="text-slate-300 font-mono">
            {aiStatus?.provider?.toUpperCase() || 'AI ENGINE READY'}
          </span>
        </div>
      </div>
    </header>
  );
};
