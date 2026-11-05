import { DecodedEmail } from '../types';

function decodeBase64Url(base64UrlStr: string): string {
  try {
    const base64 = base64UrlStr.replace(/-/g, '+').replace(/_/g, '/');
    const binStr = atob(base64);
    const len = binStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binStr.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    try {
      const base64 = base64UrlStr.replace(/-/g, '+').replace(/_/g, '/');
      return decodeURIComponent(escape(atob(base64)));
    } catch {
      return '';
    }
  }
}

function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}

interface GmailPart {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPart[];
}

function extractBodyText(payload: GmailPart): string {
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  if (payload.parts && payload.parts.length > 0) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
    }
    for (const part of payload.parts) {
      const nested = extractBodyText(part);
      if (nested) return nested;
    }
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        return stripHtml(decodeBase64Url(part.body.data));
      }
    }
  }

  if (payload.mimeType === 'text/html' && payload.body?.data) {
    return stripHtml(decodeBase64Url(payload.body.data));
  }

  return '';
}

export async function fetchRecentInboxMessages(token: string): Promise<Array<{ id: string; threadId: string }>> {
  const twoDaysAgoSeconds = Math.floor((Date.now() - 2 * 24 * 60 * 60 * 1000) / 1000);
  const query = encodeURIComponent(`in:inbox after:${twoDaysAgoSeconds}`);
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=30`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gmail API request failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return (data.messages as Array<{ id: string; threadId: string }>) || [];
}

export async function fetchAndDecodeMessage(messageId: string, token: string): Promise<DecodedEmail> {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to fetch message ${messageId} (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const headers = (data.payload?.headers || []) as Array<{ name: string; value: string }>;

  const getHeader = (name: string): string => {
    const found = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
    return found ? found.value : '';
  };

  const senderRaw = getHeader('From');
  let senderEmail = senderRaw;
  const emailMatch = senderRaw.match(/<([^>]+)>/);
  if (emailMatch && emailMatch[1]) {
    senderEmail = emailMatch[1];
  }

  const subject = getHeader('Subject') || '(No Subject)';
  const sentDate = getHeader('Date') || new Date().toISOString();
  const body = extractBodyText(data.payload || {}) || data.snippet || '';

  return {
    id: data.id,
    threadId: data.threadId || data.id,
    sender: senderRaw,
    senderEmail,
    subject,
    sentDate,
    body: body.trim(),
    snippet: data.snippet || '',
  };
}
