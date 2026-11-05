import { EventRecord, ScanLog, GeminiExtractionResult } from '../types';
import {
  isMessageProcessed,
  markMessageProcessed,
  getEventByThreadId,
  saveEvent,
  saveScanLog,
  getAppSettings,
  getEventById,
} from './db';
import { fetchRecentInboxMessages, fetchAndDecodeMessage } from './gmail';
import {
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
} from './calendar';
import { getCachedToken } from './auth';

export interface ScanProgressCallback {
  (message: string, current?: number, total?: number): void;
}

let isScanInProgress = false;

export function getIsScanInProgress(): boolean {
  return isScanInProgress;
}

async function callGeminiAnalysisApi(payload: {
  sender: string;
  subject: string;
  sentDate: string;
  body: string;
  timeZone: string;
}): Promise<GeminiExtractionResult> {
  const res = await fetch('/api/analyze-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errorData.error || `Gemini analysis failed (${res.status})`);
  }

  return (await res.json()) as GeminiExtractionResult;
}

export async function executeMeetingScan(
  onProgress?: ScanProgressCallback
): Promise<ScanLog> {
  if (isScanInProgress) {
    throw new Error('A scan is already in progress.');
  }

  const startTime = Date.now();
  isScanInProgress = true;

  const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  let emailsFoundCount = 0;
  let emailsProcessedCount = 0;
  let eventsCreatedCount = 0;
  let eventsUpdatedCount = 0;
  let eventsCancelledCount = 0;
  const errors: string[] = [];

  try {
    const token = getCachedToken();
    if (!token) {
      throw new Error('Not signed in to Google. Please sign in to scan your inbox.');
    }

    const settings = await getAppSettings();
    onProgress?.('Fetching recent messages from Gmail inbox...');

    const candidateMessages = await fetchRecentInboxMessages(token);
    emailsFoundCount = candidateMessages.length;

    const unanalyzedList: Array<{ id: string; threadId: string }> = [];
    for (const msg of candidateMessages) {
      const alreadyProcessed = await isMessageProcessed(msg.id);
      if (!alreadyProcessed) {
        unanalyzedList.push(msg);
      }
    }

    if (unanalyzedList.length === 0) {
      const durationMs = Date.now() - startTime;
      const log: ScanLog = {
        id: logId,
        timestamp: new Date().toISOString(),
        emailsFound: emailsFoundCount,
        emailsProcessed: 0,
        eventsCreated: 0,
        eventsUpdated: 0,
        eventsCancelled: 0,
        status: 'success',
        message: 'Inbox up to date. No new unprocessed emails found in the last 2 days.',
        durationMs,
      };
      await saveScanLog(log);
      onProgress?.('Inbox up to date. Scan complete.');
      return log;
    }

    const batch = unanalyzedList.slice(0, 8);
    const totalToProcess = batch.length;

    for (let i = 0; i < batch.length; i++) {
      const item = batch[i];
      const emailNumber = i + 1;

      if (i > 0) {
        onProgress?.(
          `Waiting 7s rate-limit pause before email ${emailNumber} of ${totalToProcess}...`,
          emailNumber,
          totalToProcess
        );
        await new Promise((resolve) => setTimeout(resolve, 7000));
      }

      onProgress?.(
        `Fetching email ${emailNumber} of ${totalToProcess}...`,
        emailNumber,
        totalToProcess
      );

      let decodedEmail;
      try {
        decodedEmail = await fetchAndDecodeMessage(item.id, token);
      } catch (fetchErr) {
        const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        errors.push(`Failed fetching message ${item.id}: ${msg}`);
        continue;
      }

      onProgress?.(
        `Analyzing email ${emailNumber} of ${totalToProcess} with Gemini...`,
        emailNumber,
        totalToProcess
      );

      let extraction: GeminiExtractionResult;
      try {
        extraction = await callGeminiAnalysisApi({
          sender: decodedEmail.sender,
          subject: decodedEmail.subject,
          sentDate: decodedEmail.sentDate,
          body: decodedEmail.body,
          timeZone: settings.timeZone,
        });
      } catch (geminiErr) {
        const msg = geminiErr instanceof Error ? geminiErr.message : String(geminiErr);
        errors.push(`Gemini analysis failed for "${decodedEmail.subject}": ${msg}`);
        continue;
      }

      emailsProcessedCount++;

      await markMessageProcessed({
        messageId: decodedEmail.id,
        threadId: decodedEmail.threadId,
        processedAt: new Date().toISOString(),
        hadEvent: extraction.hasEvent,
      });

      if (!extraction.hasEvent) {
        continue;
      }

      const existingThreadEvent = await getEventByThreadId(decodedEmail.threadId);
      const emailLink = `https://mail.google.com/mail/u/0/#inbox/${decodedEmail.id}`;

      if (existingThreadEvent && existingThreadEvent.status !== 'Cancelled') {
        if (extraction.cancelled) {
          if (existingThreadEvent.googleCalendarEventId) {
            try {
              await deleteGoogleCalendarEvent(existingThreadEvent.googleCalendarEventId, token);
            } catch (calErr) {
              const msg = calErr instanceof Error ? calErr.message : String(calErr);
              errors.push(`Failed deleting calendar event for cancelled meeting: ${msg}`);
            }
          }

          existingThreadEvent.status = 'Cancelled';
          existingThreadEvent.updatedAt = new Date().toISOString();
          existingThreadEvent.snippet = decodedEmail.snippet;
          await saveEvent(existingThreadEvent);
          eventsCancelledCount++;
        } else {
          let updatedCalEvent;
          if (existingThreadEvent.googleCalendarEventId) {
            try {
              updatedCalEvent = await updateGoogleCalendarEvent(
                existingThreadEvent.googleCalendarEventId,
                {
                  title: extraction.title,
                  start: extraction.start,
                  end: extraction.end,
                  location: extraction.location,
                  confirmed: extraction.confirmed,
                  messageId: decodedEmail.id,
                  threadId: decodedEmail.threadId,
                  sender: decodedEmail.sender,
                  subject: decodedEmail.subject,
                  timeZone: settings.timeZone,
                },
                token
              );
            } catch (calErr) {
              const msg = calErr instanceof Error ? calErr.message : String(calErr);
              errors.push(`Failed updating calendar event: ${msg}`);
            }
          }

          existingThreadEvent.title = extraction.title;
          existingThreadEvent.start = extraction.start;
          existingThreadEvent.end = extraction.end;
          existingThreadEvent.location = extraction.location;
          existingThreadEvent.status = extraction.confirmed ? 'Confirmed' : 'Tentative';
          existingThreadEvent.confidence = extraction.confidence;
          existingThreadEvent.updatedAt = new Date().toISOString();
          existingThreadEvent.snippet = decodedEmail.snippet;
          if (updatedCalEvent?.htmlLink) {
            existingThreadEvent.calendarLink = updatedCalEvent.htmlLink;
          }
          await saveEvent(existingThreadEvent);
          eventsUpdatedCount++;
        }
      } else {
        if (extraction.cancelled) {
          continue;
        }

        const isLowConfidence = extraction.confidence < 0.6;
        const newEventRecord: EventRecord = {
          id: 'evt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
          messageId: decodedEmail.id,
          threadId: decodedEmail.threadId,
          title: extraction.title,
          start: extraction.start,
          end: extraction.end,
          location: extraction.location,
          sender: decodedEmail.sender,
          senderEmail: decodedEmail.senderEmail,
          subject: decodedEmail.subject,
          dateReceived: decodedEmail.sentDate,
          snippet: decodedEmail.snippet,
          bodyExcerpt: decodedEmail.body.slice(0, 300),
          status: isLowConfidence ? 'Needs Review' : extraction.confirmed ? 'Confirmed' : 'Tentative',
          confidence: extraction.confidence,
          emailLink,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        if (!isLowConfidence) {
          try {
            const calEvent = await createGoogleCalendarEvent(
              {
                title: extraction.title,
                start: extraction.start,
                end: extraction.end,
                location: extraction.location,
                confirmed: extraction.confirmed,
                messageId: decodedEmail.id,
                threadId: decodedEmail.threadId,
                sender: decodedEmail.sender,
                subject: decodedEmail.subject,
                timeZone: settings.timeZone,
              },
              token
            );
            newEventRecord.googleCalendarEventId = calEvent.id;
            newEventRecord.calendarLink = calEvent.htmlLink;
          } catch (calErr) {
            const msg = calErr instanceof Error ? calErr.message : String(calErr);
            errors.push(`Failed adding event to Google Calendar: ${msg}`);
          }
        }

        await saveEvent(newEventRecord);
        eventsCreatedCount++;
      }
    }

    const durationMs = Date.now() - startTime;
    let finalStatus: 'success' | 'warning' | 'error' = 'success';
    if (errors.length > 0 && emailsProcessedCount === 0) {
      finalStatus = 'error';
    } else if (errors.length > 0) {
      finalStatus = 'warning';
    }

    const summaryMessage =
      `Processed ${emailsProcessedCount} of ${batch.length} new emails. ` +
      `Events: ${eventsCreatedCount} created, ${eventsUpdatedCount} updated, ${eventsCancelledCount} cancelled.` +
      (errors.length > 0 ? ` (Encountered ${errors.length} non-fatal error(s))` : '');

    const log: ScanLog = {
      id: logId,
      timestamp: new Date().toISOString(),
      emailsFound: emailsFoundCount,
      emailsProcessed: emailsProcessedCount,
      eventsCreated: eventsCreatedCount,
      eventsUpdated: eventsUpdatedCount,
      eventsCancelled: eventsCancelledCount,
      status: finalStatus,
      message: summaryMessage + (errors.length > 0 ? ` Errors: ${errors.join(' | ')}` : ''),
      durationMs,
    };

    await saveScanLog(log);
    onProgress?.('Scan completed successfully.');
    return log;
  } catch (err: unknown) {
    const durationMs = Date.now() - startTime;
    const msg = err instanceof Error ? err.message : String(err);
    const log: ScanLog = {
      id: logId,
      timestamp: new Date().toISOString(),
      emailsFound: emailsFoundCount,
      emailsProcessed: emailsProcessedCount,
      eventsCreated: eventsCreatedCount,
      eventsUpdated: eventsUpdatedCount,
      eventsCancelled: eventsCancelledCount,
      status: 'error',
      message: `Scan failed: ${msg}`,
      durationMs,
    };
    await saveScanLog(log);
    onProgress?.(`Scan error: ${msg}`);
    throw err;
  } finally {
    isScanInProgress = false;
  }
}

export async function approveNeedsReviewEvent(eventId: string): Promise<EventRecord> {
  const event = await getEventById(eventId);
  if (!event) {
    throw new Error('Event not found.');
  }

  const token = getCachedToken();
  if (!token) {
    throw new Error('Sign in required to create Google Calendar event.');
  }

  const settings = await getAppSettings();

  const calResult = await createGoogleCalendarEvent(
    {
      title: event.title,
      start: event.start,
      end: event.end,
      location: event.location,
      confirmed: true,
      messageId: event.messageId,
      threadId: event.threadId,
      sender: event.sender,
      subject: event.subject,
      timeZone: settings.timeZone,
    },
    token
  );

  event.status = 'Confirmed';
  event.googleCalendarEventId = calResult.id;
  event.calendarLink = calResult.htmlLink;
  event.updatedAt = new Date().toISOString();

  await saveEvent(event);
  return event;
}

export async function dismissNeedsReviewEvent(eventId: string): Promise<void> {
  const event = await getEventById(eventId);
  if (!event) return;

  event.status = 'Cancelled';
  event.updatedAt = new Date().toISOString();
  await saveEvent(event);
}
