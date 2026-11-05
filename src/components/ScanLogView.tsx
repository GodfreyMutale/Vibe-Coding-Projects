import React from 'react';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Trash2,
  RefreshCw,
  Mail,
  CalendarCheck,
  CalendarX,
  History,
} from 'lucide-react';
import { ScanLog } from '../types';

interface ScanLogViewProps {
  logs: ScanLog[];
  onClearLogs: () => Promise<void>;
  onScanNow: () => void;
  isScanning: boolean;
}

export const ScanLogView: React.FC<ScanLogViewProps> = ({
  logs,
  onClearLogs,
  onScanNow,
  isScanning,
}) => {
  const [clearing, setClearing] = React.useState(false);

  const handleClear = async () => {
    if (confirm('Clear all scan history logs?')) {
      try {
        setClearing(true);
        await onClearLogs();
      } finally {
        setClearing(false);
      }
    }
  };

  const formatTimestamp = (ts: string) => {
    try {
      const date = new Date(ts);
      return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return ts;
    }
  };

  const renderStatus = (status: ScanLog['status']) => {
    switch (status) {
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="w-3 h-3" /> Success
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" /> Warning
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" /> Error
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" />
            Scan Activity Log
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Automatic scans run every 15 minutes while the app is open.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {logs.length > 0 && (
            <button
              onClick={handleClear}
              disabled={clearing}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}

          <button
            onClick={onScanNow}
            disabled={isScanning}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>Scan Now</span>
          </button>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
            <History className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-white">No scan logs recorded yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            Logs will appear here once Meeting Scanner inspects your inbox.
          </p>
          <button
            onClick={onScanNow}
            disabled={isScanning}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-colors"
          >
            Run First Scan
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className="p-4 rounded-xl border border-slate-800 bg-slate-900/70 shadow-sm space-y-3 hover:border-slate-750 transition-colors"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {renderStatus(log.status)}
                  <span className="text-xs font-medium text-slate-200">
                    {formatTimestamp(log.timestamp)}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                  <Clock className="w-3 h-3" />
                  <span>{(log.durationMs / 1000).toFixed(1)}s</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Mail className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Found: <strong className="text-white">{log.emailsFound}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                  <span>Analyzed: <strong className="text-white">{log.emailsProcessed}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <CalendarCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Created: <strong className="text-emerald-300">{log.eventsCreated}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <CalendarX className="w-3.5 h-3.5 text-rose-400" />
                  <span>Cancelled: <strong className="text-rose-300">{log.eventsCancelled}</strong></span>
                </div>
              </div>

              <div className="text-xs text-slate-300 font-mono bg-slate-900/90 p-2.5 rounded border border-slate-800/80 break-words">
                {log.message}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
