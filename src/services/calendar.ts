export interface CalendarEventPayload {
  title: string;
  start: string;
  end?: string;
  location?: string;
  confirmed: boolean;
  messageId: string;
  threadId: string;
  sender: string;
  subject: string;
  timeZone?: string;
}

export interface CreatedCalendarEvent {
  id: string;
  htmlLink: string;
}

function resolveStartAndEnd(start: string, end?: string): { startDateTime: string; endDateTime: string } {
  let startDate = new Date(start);
  if (isNaN(startDate.getTime())) {
    startDate = new Date();
  }

  let endDate: Date;
  if (end && !isNaN(new Date(end).getTime())) {
    endDate = new Date(end);
    if (endDate.getTime() <= startDate.getTime()) {
      endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    }
  } else {
    endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
  }

  return {
    startDateTime: startDate.toISOString(),
    endDateTime: endDate.toISOString(),
  };
}

export async function createGoogleCalendarEvent(
  payload: CalendarEventPayload,
  token: string
): Promise<CreatedCalendarEvent> {
  const { startDateTime, endDateTime } = resolveStartAndEnd(payload.start, payload.end);
  const emailLink = `https://mail.google.com/mail/u/0/#inbox/${payload.messageId}`;

  const summary = payload.confirmed
    ? payload.title.replace(/^\[Tentative\]\s*/i, '')
    : payload.title.startsWith('[Tentative]')
      ? payload.title
      : `[Tentative] ${payload.title}`;

  const description = [
    `Meeting detected by Meeting Scanner`,
    `From: ${payload.sender}`,
    `Subject: ${payload.subject}`,
    `Original Email: ${emailLink}`,
  ].join('\n\n');

  const body: Record<string, unknown> = {
    summary,
    description,
    start: {
      dateTime: startDateTime,
      timeZone: payload.timeZone,
    },
    end: {
      dateTime: endDateTime,
      timeZone: payload.timeZone,
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 1440 },
        { method: 'popup', minutes: 30 },
      ],
    },
  };

  if (payload.location && payload.location.trim().length > 0) {
    body.location = payload.location.trim();
  }

  const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google Calendar API event creation failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return {
    id: data.id,
    htmlLink: data.htmlLink || `https://calendar.google.com/calendar/r/eventedit/${data.id}`,
  };
}

export async function updateGoogleCalendarEvent(
  calendarEventId: string,
  payload: CalendarEventPayload,
  token: string
): Promise<CreatedCalendarEvent> {
  const { startDateTime, endDateTime } = resolveStartAndEnd(payload.start, payload.end);
  const emailLink = `https://mail.google.com/mail/u/0/#inbox/${payload.messageId}`;

  const summary = payload.confirmed
    ? payload.title.replace(/^\[Tentative\]\s*/i, '')
    : payload.title.startsWith('[Tentative]')
      ? payload.title
      : `[Tentative] ${payload.title}`;

  const description = [
    `Meeting rescheduled by Meeting Scanner`,
    `From: ${payload.sender}`,
    `Subject: ${payload.subject}`,
    `Latest Email: ${emailLink}`,
  ].join('\n\n');

  const body: Record<string, unknown> = {
    summary,
    description,
    start: {
      dateTime: startDateTime,
      timeZone: payload.timeZone,
    },
    end: {
      dateTime: endDateTime,
      timeZone: payload.timeZone,
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 1440 },
        { method: 'popup', minutes: 30 },
      ],
    },
  };

  if (payload.location && payload.location.trim().length > 0) {
    body.location = payload.location.trim();
  }

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(calendarEventId)}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google Calendar API event update failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return {
    id: data.id,
    htmlLink: data.htmlLink || `https://calendar.google.com/calendar/r/eventedit/${data.id}`,
  };
}

export async function deleteGoogleCalendarEvent(calendarEventId: string, token: string): Promise<void> {
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(calendarEventId)}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok && res.status !== 404 && res.status !== 410) {
    const errorText = await res.text();
    throw new Error(`Google Calendar API event deletion failed (${res.status}): ${errorText}`);
  }
}
