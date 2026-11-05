import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  ExternalLink,
  Mail,
  MapPin,
  Search,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Check,
  X,
  Sparkles,
  Inbox,
  Filter,
} from 'lucide-react';
import { EventRecord, EventStatus } from '../types';

interface EventsTableProps {
  events: EventRecord[];
  processedEmailCount: number;
  onApprove: (id: string) => Promise<void>;
  onDismiss: (id: string) => Promise<void>;
  onScanNow: () => void;
  isScanning: boolean;
  userEmail: string | null;
}

export const EventsTable: React.FC<EventsTableProps> = ({
  events,
  processedEmailCount,
  onApprove,
  onDismiss,
  onScanNow,
  isScanning,
  userEmail,
}) => {
  const [activeFilter, setActiveFilter] = useState<'All' | EventStatus>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const stats = useMemo(() => {
    return {
      emailsScanned: processedEmailCount,
      totalEvents: events.length,
      needsReview: events.filter((e) => e.status === 'Needs Review').length,
      confirmed: events.filter((e) => e.status === 'Confirmed').length,
      tentative: events.filter((e) => e.status === 'Tentative').length,
      cancelled: events.filter((e) => e.status === 'Cancelled').length,
    };
  }, [events, processedEmailCount]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesFilter = activeFilter === 'All' || event.status === activeFilter;
      if (!matchesFilter) return false;

      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        event.title.toLowerCase().includes(query) ||
        event.sender.toLowerCase().includes(query) ||
        event.subject.toLowerCase().includes(query) ||
        (event.location && event.location.toLowerCase().includes(query))
      );
    });
  }, [events, activeFilter, searchQuery]);

  const handleApproveAction = async (id: string) => {
    try {
      setProcessingId(id);
      await onApprove(id);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDismissAction = async (id: string) => {
    try {
      setProcessingId(id);
      await onDismiss(id);
    } finally {
      setProcessingId(null);
    }
  };

  const formatEventDateTime = (startStr: string, endStr?: string) => {
    if (!startStr) return { primary: 'Unspecified Time', secondary: '' };
    try {
      const startDate = new Date(startStr);
      if (isNaN(startDate.getTime())) return { primary: startStr, secondary: '' };

      const datePart = startDate.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      const timePart = startDate.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      });

      let endTimePart = '';
      if (endStr) {
        const endDate = new Date(endStr);
        if (!isNaN(endDate.getTime())) {
          endTimePart = ' - ' + endDate.toLocaleTimeString(undefined, {
            hour: 'numeric',
            minute: '2-digit',
          });
        }
      }

      return {
        primary: `${datePart}`,
        secondary: `${timePart}${endTimePart}`,
      };
    } catch {
      return { primary: startStr, secondary: '' };
    }
  };

  const renderStatusBadge = (status: EventStatus) => {
    switch (status) {
      case 'Confirmed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <CheckCircle className="w-3.5 h-3.5" />
            Confirmed
          </span>
        );
      case 'Tentative':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" />
            Tentative
          </span>
        );
      case 'Needs Review':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5 text-indigo-400" />
            Needs Review
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30 line-through">
            <XCircle className="w-3.5 h-3.5" />
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <div
          className="p-4 rounded-xl border bg-slate-900/60 border-slate-800"
        >
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-indigo-400" /> Emails Scanned
          </div>
          <div className="text-2xl font-bold text-indigo-300 mt-1">{stats.emailsScanned}</div>
        </div>

        <div
          onClick={() => setActiveFilter('All')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            activeFilter === 'All'
              ? 'bg-slate-800/90 border-indigo-500 ring-1 ring-indigo-500'
              : 'bg-slate-900/60 border-slate-800 hover:bg-slate-850'
          }`}
        >
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-300" /> Total Meetings
          </div>
          <div className="text-2xl font-bold text-white mt-1">{stats.totalEvents}</div>
        </div>

        <div
          onClick={() => setActiveFilter('Needs Review')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            activeFilter === 'Needs Review'
              ? 'bg-amber-950/40 border-amber-500 ring-1 ring-amber-500'
              : 'bg-slate-900/60 border-slate-800 hover:bg-slate-850'
          }`}
        >
          <div className="text-xs font-medium text-amber-400 uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Needs Review
          </div>
          <div className="text-2xl font-bold text-amber-300 mt-1">{stats.needsReview}</div>
        </div>

        <div
          onClick={() => setActiveFilter('Confirmed')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            activeFilter === 'Confirmed'
              ? 'bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500'
              : 'bg-slate-900/60 border-slate-800 hover:bg-slate-850'
          }`}
        >
          <div className="text-xs font-medium text-emerald-400 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Confirmed
          </div>
          <div className="text-2xl font-bold text-emerald-300 mt-1">{stats.confirmed}</div>
        </div>

        <div
          onClick={() => setActiveFilter('Tentative')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            activeFilter === 'Tentative'
              ? 'bg-amber-950/30 border-amber-400 ring-1 ring-amber-400'
              : 'bg-slate-900/60 border-slate-800 hover:bg-slate-850'
          }`}
        >
          <div className="text-xs font-medium text-amber-300 uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3 h-3" /> Tentative
          </div>
          <div className="text-2xl font-bold text-amber-200 mt-1">{stats.tentative}</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['All', 'Needs Review', 'Confirmed', 'Tentative', 'Cancelled'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeFilter === filter
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {filter}
              {filter === 'Needs Review' && stats.needsReview > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950">
                  {stats.needsReview}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search events, senders, subjects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-12 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
            <Inbox className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-white">No meetings found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-6">
            {!userEmail
              ? 'Sign in with your Google account to let Meeting Scanner inspect recent inbox emails.'
              : activeFilter !== 'All'
                ? `No meetings match the "${activeFilter}" filter.`
                : 'No meetings detected in recent emails from the past 2 days. Click "Scan Now" to check your inbox.'}
          </p>
          {userEmail && (
            <button
              onClick={onScanNow}
              disabled={isScanning}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Scan Inbox Now
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="hidden lg:block overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/90 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Event & Location</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Sender & Email</th>
                  <th className="py-3 px-4">Status & Confidence</th>
                  <th className="py-3 px-4 text-right">Actions / Links</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs text-slate-200">
                {filteredEvents.map((event) => {
                  const { primary, secondary } = formatEventDateTime(event.start, event.end);
                  const isItemProcessing = processingId === event.id;

                  return (
                    <tr key={event.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-semibold text-white text-sm truncate flex items-center gap-1.5">
                          {event.title}
                        </div>
                        {event.location ? (
                          <div className="text-[11px] text-indigo-300 flex items-center gap-1 mt-0.5 truncate">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-500 mt-0.5 truncate">{event.subject}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-100 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                          {primary}
                        </div>
                        {secondary && (
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5 ml-5">
                            {secondary}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-medium text-slate-200 truncate">{event.sender}</div>
                        <div className="text-[11px] text-slate-400 truncate font-mono">{event.senderEmail}</div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {renderStatusBadge(event.status)}
                          <div
                            title={`Confidence: ${Math.round(event.confidence * 100)}%`}
                            className="text-[10px] text-slate-400 font-mono px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800"
                          >
                            {Math.round(event.confidence * 100)}%
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {event.status === 'Needs Review' ? (
                            <>
                              <button
                                onClick={() => handleApproveAction(event.id)}
                                disabled={isItemProcessing}
                                title="Approve and add to Calendar"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" /> Approve
                              </button>
                              <button
                                onClick={() => handleDismissAction(event.id)}
                                disabled={isItemProcessing}
                                title="Dismiss proposal"
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 text-xs transition-colors"
                              >
                                <X className="w-3.5 h-3.5" /> Dismiss
                              </button>
                            </>
                          ) : (
                            <>
                              {event.calendarLink && event.status !== 'Cancelled' && (
                                <a
                                  href={event.calendarLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs transition-colors"
                                >
                                  <Calendar className="w-3.5 h-3.5" /> Calendar
                                </a>
                              )}
                              <a
                                href={event.emailLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                              >
                                <Mail className="w-3.5 h-3.5" /> Email <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden">
            {filteredEvents.map((event) => {
              const { primary, secondary } = formatEventDateTime(event.start, event.end);
              const isItemProcessing = processingId === event.id;

              return (
                <div
                  key={event.id}
                  className="p-4 rounded-xl border border-slate-800 bg-slate-900/80 shadow-md space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-white text-sm leading-snug">{event.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{event.subject}</p>
                    </div>
                    {renderStatusBadge(event.status)}
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-850">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                      <span className="font-medium text-slate-100">{primary}</span>
                      {secondary && <span className="text-slate-400 font-mono text-[11px]">{secondary}</span>}
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2 text-indigo-300">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                      <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{event.sender}</span>
                    </div>
                  </div>

                  {event.bodyExcerpt && (
                    <div className="text-[11px] text-slate-400 line-clamp-2 italic bg-slate-900/50 p-2 rounded border border-slate-800/60">
                      "{event.bodyExcerpt}"
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 gap-2">
                    <div className="text-[11px] font-mono text-slate-500">
                      Confidence: {Math.round(event.confidence * 100)}%
                    </div>

                    <div className="flex items-center gap-2">
                      {event.status === 'Needs Review' ? (
                        <>
                          <button
                            onClick={() => handleApproveAction(event.id)}
                            disabled={isItemProcessing}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                          >
                            <Check className="w-3 h-3" /> Approve
                          </button>
                          <button
                            onClick={() => handleDismissAction(event.id)}
                            disabled={isItemProcessing}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-xs"
                          >
                            <X className="w-3 h-3" /> Dismiss
                          </button>
                        </>
                      ) : (
                        <>
                          {event.calendarLink && event.status !== 'Cancelled' && (
                            <a
                              href={event.calendarLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs font-medium inline-flex items-center gap-1"
                            >
                              <Calendar className="w-3 h-3" /> Calendar
                            </a>
                          )}
                          <a
                            href={event.emailLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-xs inline-flex items-center gap-1"
                          >
                            <Mail className="w-3 h-3" /> Email
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
