import React from 'react';
import { Calendar, RefreshCw, Shield, HelpCircle, LogOut, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { UserProfile } from '../types';

interface HeaderProps {
  user: UserProfile | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onScanNow: () => void;
  isScanning: boolean;
  scanProgressText: string;
  nextScanCountdown: number;
  activeTab: 'events' | 'logs' | 'settings';
  setActiveTab: (tab: 'events' | 'logs' | 'settings') => void;
  needsReviewCount: number;
  onOpenGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onSignIn,
  onSignOut,
  onScanNow,
  isScanning,
  scanProgressText,
  nextScanCountdown,
  activeTab,
  setActiveTab,
  needsReviewCount,
  onOpenGuide,
}) => {
  const formatCountdown = (seconds: number) => {
    if (seconds <= 0) return 'Any moment';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">Meeting Scanner</h1>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  AI + Calendar
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Conversational Email to Calendar Sync</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onOpenGuide}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
              <span>Setup Guide</span>
            </button>

            {user && (
              <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-lg font-mono">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Next scan:</span>
                <span className="text-slate-200 font-semibold">{isScanning ? 'In progress' : formatCountdown(nextScanCountdown)}</span>
              </div>
            )}

            <button
              onClick={onScanNow}
              disabled={isScanning || !user}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white shadow-md transition-all ${
                isScanning
                  ? 'bg-indigo-600/50 cursor-not-allowed text-indigo-200'
                  : !user
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-500 active:scale-95 shadow-indigo-500/25'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isScanning ? 'Scanning...' : 'Scan Now'}</span>
              <span className="sm:hidden">{isScanning ? '...' : 'Scan'}</span>
            </button>

            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg text-xs text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="max-w-[120px] truncate hidden md:inline font-medium">{user.email}</span>
                </div>
                <button
                  onClick={onSignOut}
                  title="Sign out"
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onSignIn}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-900 hover:bg-slate-100 shadow transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
                <span>Sign in with Google</span>
              </button>
            )}
          </div>
        </div>

        {isScanning && scanProgressText && (
          <div className="pb-3 pt-1">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              <span>{scanProgressText}</span>
            </div>
          </div>
        )}

        <div className="flex border-t border-slate-800 -mb-px space-x-1 sm:space-x-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('events')}
            className={`py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'events'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Events</span>
            {needsReviewCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                {needsReviewCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'logs'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Scan Log</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'settings'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Settings</span>
          </button>
          <button
            onClick={onOpenGuide}
            className="md:hidden py-3 px-3 text-xs sm:text-sm font-medium border-b-2 border-transparent text-slate-400 hover:text-slate-200 whitespace-nowrap"
          >
            Setup Guide
          </button>
        </div>
      </div>
    </header>
  );
};
