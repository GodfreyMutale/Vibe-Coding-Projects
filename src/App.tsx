import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { EventsTable } from './components/EventsTable';
import { ScanLogView } from './components/ScanLogView';
import { SettingsView } from './components/SettingsView';
import { BeginnerGuideModal } from './components/BeginnerGuideModal';
import { EventRecord, ScanLog, UserProfile } from './types';
import {
  getAllEvents,
  getAllScanLogs,
  clearScanLogs,
  getAppSettings,
  getProcessedMessageCount,
} from './services/db';
import {
  requestGoogleSignIn,
  signOut,
  onAuthStateChange,
  getCachedToken,
  getEffectiveClientId,
} from './services/auth';
import {
  executeMeetingScan,
  approveNeedsReviewEvent,
  dismissNeedsReviewEvent,
  getIsScanInProgress,
} from './services/scanner';
import { AlertCircle, X, ShieldAlert } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [processedEmailCount, setProcessedEmailCount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'events' | 'logs' | 'settings'>('events');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgressText, setScanProgressText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [nextScanCountdown, setNextScanCountdown] = useState(15 * 60);

  const initialScanTriggeredRef = useRef(false);
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  const loadData = useCallback(async () => {
    try {
      const [fetchedEvents, fetchedLogs, count] = await Promise.all([
        getAllEvents(),
        getAllScanLogs(),
        getProcessedMessageCount(),
      ]);
      setEvents(fetchedEvents);
      setLogs(fetchedLogs);
      setProcessedEmailCount(count);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Failed loading database records: ${msg}`);
    }
  }, []);

  const handleRunScan = useCallback(async () => {
    if (getIsScanInProgress()) return;

    const currentToken = getCachedToken();
    if (!currentToken) {
      setErrorMessage('Please sign in with Google to scan your inbox.');
      return;
    }

    setIsScanning(true);
    setScanProgressText('Starting scan...');
    setErrorMessage(null);

    try {
      await executeMeetingScan((progressMsg) => {
        setScanProgressText(progressMsg);
      });
      await loadData();
      const settings = await getAppSettings();
      setNextScanCountdown((settings.scanIntervalMinutes || 15) * 60);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
      await loadData();
    } finally {
      setIsScanning(false);
      setScanProgressText('');
    }
  }, [loadData]);

  useEffect(() => {
    loadData();

    const unsubscribe = onAuthStateChange((currentUser, currentToken) => {
      setUser(currentUser);
      setToken(currentToken);

      if (currentToken && !initialScanTriggeredRef.current) {
        initialScanTriggeredRef.current = true;
        handleRunScan();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [loadData, handleRunScan]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNextScanCountdown((prev) => {
        if (prev <= 1) {
          if (getCachedToken() && !getIsScanInProgress()) {
            handleRunScan();
          }
          return 15 * 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [handleRunScan]);

  const handleSignIn = async () => {
    setErrorMessage(null);
    try {
      const clientId = await getEffectiveClientId();
      if (!clientId) {
        setIsGuideOpen(true);
        setActiveTab('settings');
        setErrorMessage('Google OAuth Client ID is required. Please follow the setup guide to paste your Client ID.');
        return;
      }
      await requestGoogleSignIn(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Google Sign-In failed: ${msg}`);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
      setToken(null);
      initialScanTriggeredRef.current = false;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Sign out failed: ${msg}`);
    }
  };

  const handleApprove = async (id: string) => {
    setErrorMessage(null);
    try {
      await approveNeedsReviewEvent(id);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Failed to approve event: ${msg}`);
    }
  };

  const handleDismiss = async (id: string) => {
    setErrorMessage(null);
    try {
      await dismissNeedsReviewEvent(id);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Failed to dismiss event: ${msg}`);
    }
  };

  const handleClearLogs = async () => {
    await clearScanLogs();
    await loadData();
  };

  const needsReviewCount = events.filter((e) => e.status === 'Needs Review').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Header
        user={user}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onScanNow={handleRunScan}
        isScanning={isScanning}
        scanProgressText={scanProgressText}
        nextScanCountdown={nextScanCountdown}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        needsReviewCount={needsReviewCount}
        onOpenGuide={() => setIsGuideOpen(true)}
      />

      {errorMessage && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4">
          <div className="flex items-start justify-between gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs sm:text-sm animate-in fade-in duration-200">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold text-rose-200">Error Notice:</strong>
                <p className="mt-0.5 text-rose-300 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-white p-1 rounded hover:bg-rose-500/20 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'events' && (
          <EventsTable
            events={events}
            processedEmailCount={processedEmailCount}
            onApprove={handleApprove}
            onDismiss={handleDismiss}
            onScanNow={handleRunScan}
            isScanning={isScanning}
            userEmail={user?.email || null}
          />
        )}

        {activeTab === 'logs' && (
          <ScanLogView
            logs={logs}
            onClearLogs={handleClearLogs}
            onScanNow={handleRunScan}
            isScanning={isScanning}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            onSettingsSaved={loadData}
            onOpenGuide={() => setIsGuideOpen(true)}
            appOrigin={appOrigin}
          />
        )}
      </main>

      <BeginnerGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        appOrigin={appOrigin}
      />
    </div>
  );
}
