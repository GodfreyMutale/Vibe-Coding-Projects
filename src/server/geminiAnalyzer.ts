import { GoogleGenAI, Type } from '@google/genai';
import { GeminiExtractionResult } from '../types';

export interface EmailAnalysisInput {
  sender: string;
  subject: string;
  sentDate: string;
  body: string;
  timeZone: string;
}

export async function analyzeEmailWithGemini(input: EmailAnalysisInput): Promise<GeminiExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured.');
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = [
    `You are an expert meeting extraction engine. Analyze the following conversational email to detect upcoming meetings, calls, events, or appointments that specify a meeting date, meeting time, and meeting confirmation/proposal status.`,
    ``,
    `Email Metadata:`,
    `- Sender: ${input.sender}`,
    `- Subject: ${input.subject}`,
    `- Sent Date: ${input.sentDate}`,
    `- Recipient Timezone: ${input.timeZone}`,
    ``,
    `Email Body:`,
    `"""`,
    input.body.slice(0, 4000),
    `"""`,
    ``,
    `Fine-Tuned Detection Rules:`,
    `1. MEETING DATE & TIME: Look for both date and time (e.g. "Tuesday at 2:00 PM", "tomorrow at 10am", "Nov 15 from 3-4pm", "next Wednesday 11am PST").`,
    `2. RELATIVE TIME RESOLUTION: Accurately resolve expressions like "tomorrow", "this Friday", "next Tuesday", "in two days" strictly relative to the email's Sent Date (${input.sentDate}) in the recipient's timezone (${input.timeZone}). Format both start and end as valid ISO 8601 strings (e.g. YYYY-MM-DDTHH:mm:ss). If no end time is specified, calculate end as exactly 60 minutes after start.`,
    `3. CONFIRMATION DETECTION: Inspect the sender and recipient phrasing for confirmation status:`,
    `   - Set confirmed=true when there is an explicit confirmation, accepted invite, agreement on a specific time, finalized appointment, calendar confirmation, or statements like "Tuesday at 2pm works for me", "Sounds good, see you then", "Meeting confirmed for tomorrow at 10", "I have scheduled our call for Friday at 3pm".`,
    `   - Set confirmed=false when it is an unconfirmed proposal, offering one or more time slots, tentative availability, or awaiting confirmation (e.g. "Does 2pm work for you?", "I can do Tuesday at 2pm or Thursday at 4pm").`,
    `4. MULTIPLE OPTIONS: If several time options are offered, choose the first option for start and end, and set confirmed=false.`,
    `5. VAGUE INVITATIONS: Skip emails that only mention vague availability without a concrete date and time (e.g. "Let's catch up sometime next week", "Let me know when you're free"). For these, set hasEvent=false.`,
    `6. CANCELLATION DETECTION: If the email cancels, calls off, or cancels an existing scheduled meeting (e.g. "I need to cancel our meeting tomorrow", "Let's call off today's sync"), set cancelled=true and hasEvent=true.`,
    `7. TITLE & DETAILS: Produce a clean, professional title summarizing the meeting (e.g. "Catch-up with Alice", "Project Sync", "Intro Call"). Extract any location or video conference link if present.`,
    `8. CONFIDENCE SCORE: Rate confidence between 0.0 and 1.0. Emails having clear, unambiguous date, time, and confirmed details should receive 0.85 to 1.0. Emails with partial ambiguity should receive lower scores.`,
  ].join('\n');

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          hasEvent: {
            type: Type.BOOLEAN,
            description: 'Whether a meeting with specific date and time is identified or cancelled',
          },
          title: {
            type: Type.STRING,
            description: 'Concise meeting title, e.g. "Meeting with Godfrey" or "Project Sync"',
          },
          start: {
            type: Type.STRING,
            description: 'ISO 8601 string for meeting start date and time',
          },
          end: {
            type: Type.STRING,
            description: 'ISO 8601 string for meeting end date and time',
          },
          location: {
            type: Type.STRING,
            description: 'Meeting location, physical address, Google Meet or Zoom link, or empty string',
          },
          confirmed: {
            type: Type.BOOLEAN,
            description: 'True if meeting time and date are confirmed, false if proposed or tentative',
          },
          cancelled: {
            type: Type.BOOLEAN,
            description: 'True if the email cancels or calls off an event, false otherwise',
          },
          confidence: {
            type: Type.NUMBER,
            description: 'Confidence score from 0.0 to 1.0 reflecting clarity of date, time, and confirmation',
          },
        },
        required: [
          'hasEvent',
          'title',
          'start',
          'end',
          'location',
          'confirmed',
          'cancelled',
          'confidence',
        ],
      },
    },
  });

  const text = response.text || '{}';
  const parsed = JSON.parse(text) as GeminiExtractionResult;

  return {
    hasEvent: Boolean(parsed.hasEvent),
    title: String(parsed.title || 'Meeting'),
    start: String(parsed.start || ''),
    end: String(parsed.end || ''),
    location: String(parsed.location || ''),
    confirmed: Boolean(parsed.confirmed),
    cancelled: Boolean(parsed.cancelled),
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
  };
}
