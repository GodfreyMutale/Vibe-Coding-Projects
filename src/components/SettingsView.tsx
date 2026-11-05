import React, { useState, useEffect } from 'react';
import {
  Key,
  Save,
  RotateCcw,
  Clock,
  Globe,
  Database,
  Trash2,
  Check,
  Copy,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { AppSettings } from '../types';
import {
  getAppSettings,
  saveAppSettings,
  getProcessedMessageCount,
  clearProcessedMessages,
  clearAllDatabaseData,
} from '../services/db';
import { setCustomClientId, getEffectiveClientId } from '../services/auth';

interface SettingsViewProps {
  onSettingsSaved?: () => void;
  onOpenGuide: () => void;
  appOrigin: string;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onSettingsSaved,
  onOpenGuide,
  appOrigin,
}) => {
  const [clientId, setClientId] = useState('');
  const [timeZone, setTimeZone] = useState('');
  const [scanInterval, setScanInterval] = useState(15);
  const [autoScan, setAutoScan] = useState(true);
  const [processedCount, setProcessedCount] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [copiedOrigin, setCopiedOrigin] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const settings = await getAppSettings();
      const effectiveId = await getEffectiveClientId();
      setClientId(settings.googleClientId || effectiveId || '');
      setTimeZone(settings.timeZone);
      setScanInterval(settings.scanIntervalMinutes);
      setAutoScan(settings.autoScanEnabled);

      const count = await getProcessedMessageCount();
      setProcessedCount(count);
    }
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await setCustomClientId(clientId.trim());
    await saveAppSettings({
      googleClientId: clientId.trim(),
      timeZone: timeZone.trim(),
      scanIntervalMinutes: Number(scanInterval),
      autoScanEnabled: autoScan,
    });

    setIsSaved(true);
    setStatusMessage('Settings saved successfully in your browser.');
    setTimeout(() => {
      setIsSaved(false);
      setStatusMessage(null);
    }, 3000);

    onSettingsSaved?.();
  };

  const handleCopyOrigin = () => {
    navigator.clipboard.writeText(appOrigin);
    setCopiedOrigin(true);
    setTimeout(() => setCopiedOrigin(false), 2000);
  };

  const handleClearProcessedCache = async () => {
    if (confirm('Clear processed email cache? This will allow Meeting Scanner to re-evaluate recent emails from the past 2 days.')) {
      await clearProcessedMessages();
      const count = await getProcessedMessageCount();
      setProcessedCount(count);
      setStatusMessage('Processed message cache cleared.');
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleResetAllData = async () => {
    if (confirm('WARNING: This will permanently delete all stored events, processed email IDs, and scan logs from IndexedDB. Continue?')) {
      await clearAllDatabaseData();
      setProcessedCount(0);
      setStatusMessage('All database data has been reset.');
      setTimeout(() => setStatusMessage(null), 3000);
      onSettingsSaved?.();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Key className="w-6 h-6 text-indigo-400" />
          Settings & Configuration
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Manage your Google OAuth client ID, scan frequency, and browser-stored database.
        </p>
      </div>

      {statusMessage && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
          <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/70 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-400" />
              Google OAuth Client ID
            </h3>
            <button
              type="button"
              onClick={onOpenGuide}
              className="text-xs text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 font-medium"
            >
              <HelpCircle className="w-3.5 h-3.5" /> View Setup Steps
            </button>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Paste your Web application OAuth Client ID from Google Cloud Console. This allows Meeting Scanner to sign in with Google using Google Identity Services.
          </p>

          <div>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="e.g. 123456789-abcdefghijk.apps.googleusercontent.com"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Authorized JavaScript Origin for Google Cloud:</span>
              <button
                type="button"
                onClick={handleCopyOrigin}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 text-xs font-sans transition-colors"
              >
                {copiedOrigin ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" /> Copy URL
                  </>
                )}
              </button>
            </div>
            <div className="font-mono text-xs text-indigo-300 break-all select-all">
              {appOrigin}
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/70 shadow-lg space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            Scan & Timezone Preferences
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                My Timezone
              </label>
              <input
                type="text"
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
                placeholder="America/Los_Angeles"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Passed to Gemini to accurately resolve relative times like "tomorrow at 2pm".
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Automatic Scan Frequency
              </label>
              <select
                value={scanInterval}
                onChange={(e) => setScanInterval(Number(e.target.value))}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value={5}>Every 5 minutes</option>
                <option value={10}>Every 10 minutes</option>
                <option value={15}>Every 15 minutes (Default)</option>
                <option value={30}>Every 30 minutes</option>
                <option value={60}>Every 60 minutes</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Scans also trigger automatically on app open and via "Scan Now".
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="autoScan"
              checked={autoScan}
              onChange={(e) => setAutoScan(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="autoScan" className="text-xs text-slate-300 cursor-pointer font-medium">
              Enable background automatic scanning while app is open
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/25 transition-all active:scale-95"
          >
            {isSaved ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
            <span>Save Settings</span>
          </button>
        </div>
      </form>

      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Database className="w-4 h-4 text-indigo-400" />
          Local IndexedDB Storage
        </h3>
        <p className="text-xs text-slate-400">
          Everything is stored privately inside your browser using IndexedDB. No external servers store your data.
        </p>

        <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div>
            <div className="text-xs text-slate-300 font-medium">
              Processed Message Cache: <strong className="text-white">{processedCount}</strong> emails tracked
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Cached message IDs prevent re-analyzing already scanned emails.
            </div>
          </div>

          <button
            type="button"
            onClick={handleClearProcessedCache}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-750 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Cache (Re-scan Inbox)</span>
          </button>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-slate-500">
            Need to wipe everything and start fresh?
          </div>
          <button
            type="button"
            onClick={handleResetAllData}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset All Database Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
