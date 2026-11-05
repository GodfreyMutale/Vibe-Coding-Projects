export type EventStatus = 'Confirmed' | 'Tentative' | 'Needs Review' | 'Cancelled';

export interface EventRecord {
  id: string;
  messageId: string;
  threadId: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  meetingLink?: string;
  sender: string;
  senderEmail: string;
  subject: string;
  dateReceived: string;
  snippet?: string;
  bodyExcerpt?: string;
  status: EventStatus;
  confidence: number;
  googleCalendarEventId?: string;
  emailLink: string;
  calendarLink?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessedMessage {
  messageId: string;
  threadId: string;
  processedAt: string;
  hadEvent: boolean;
  error?: string;
}

export interface ScanLog {
  id: string;
  timestamp: string;
  emailsFound: number;
  emailsProcessed: number;
  eventsCreated: number;
  eventsUpdated: number;
  eventsCancelled: number;
  status: 'success' | 'warning' | 'error';
  message: string;
  durationMs: number;
}

export interface AppSettings {
  googleClientId: string;
  timeZone: string;
  scanIntervalMinutes: number;
  autoScanEnabled: boolean;
  lookbackDays: number;
}

export interface GeminiExtractionResult {
  hasEvent: boolean;
  title: string;
  start: string;
  end: string;
  location: string;
  confirmed: boolean;
  cancelled: boolean;
  confidence: number;
}

export interface DecodedEmail {
  id: string;
  threadId: string;
  sender: string;
  senderEmail: string;
  subject: string;
  sentDate: string;
  body: string;
  snippet: string;
}

export interface UserProfile {
  email: string;
  name?: string;
  picture?: string;
}
