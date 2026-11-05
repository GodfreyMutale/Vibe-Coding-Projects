import { UserProfile } from '../types';
import { getSetting, setSetting } from './db';
import firebaseConfig from '../../firebase-applet-config.json';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
            error_callback?: (err: unknown) => void;
          }) => TokenClient;
          revoke: (token: string, done: () => void) => void;
        };
      };
    };
  }
}

interface TokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
  error_uri?: string;
  expires_in?: number;
}

interface TokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
}

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ');

let memoryAccessToken: string | null = null;
let tokenExpiresAt: number = 0;
let currentUserProfile: UserProfile | null = null;
let tokenClientInstance: TokenClient | null = null;
let lastUsedClientId: string = '';

const authChangeListeners: Array<(user: UserProfile | null, token: string | null) => void> = [];

export function onAuthStateChange(listener: (user: UserProfile | null, token: string | null) => void): () => void {
  authChangeListeners.push(listener);
  listener(currentUserProfile, memoryAccessToken);
  return () => {
    const idx = authChangeListeners.indexOf(listener);
    if (idx !== -1) authChangeListeners.splice(idx, 1);
  };
}

function notifyAuthChange() {
  for (const listener of authChangeListeners) {
    listener(currentUserProfile, memoryAccessToken);
  }
}

export async function getEffectiveClientId(): Promise<string> {
  const customId = await getSetting<string>('googleClientId', '');
  if (customId && customId.trim().length > 0) {
    return customId.trim();
  }
  const defaultId = (firebaseConfig as { oAuthClientId?: string })?.oAuthClientId || '';
  return defaultId.trim();
}

export async function setCustomClientId(clientId: string): Promise<void> {
  await setSetting('googleClientId', clientId.trim());
  tokenClientInstance = null;
  lastUsedClientId = '';
}

export function getCachedToken(): string | null {
  if (memoryAccessToken && Date.now() < tokenExpiresAt) {
    return memoryAccessToken;
  }
  if (memoryAccessToken && Date.now() >= tokenExpiresAt) {
    memoryAccessToken = null;
    currentUserProfile = null;
    notifyAuthChange();
  }
  return null;
}

async function fetchUserProfile(token: string): Promise<UserProfile> {
  try {
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error(`Profile fetch failed: ${res.statusText}`);
    }
    const data = await res.json();
    return {
      email: data.emailAddress,
      name: data.emailAddress.split('@')[0],
    };
  } catch (err) {
    return {
      email: 'Connected User',
    };
  }
}

function waitForGoogleScript(timeoutMs = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const startTime = Date.now();
    const interval = setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        clearInterval(interval);
        resolve();
      } else if (Date.now() - startTime > timeoutMs) {
        clearInterval(interval);
        reject(new Error('Google Identity Services script did not load. Please check your internet connection or ad blocker.'));
      }
    }, 100);
  });
}

export async function requestGoogleSignIn(interactive = true): Promise<{ user: UserProfile; token: string }> {
  await waitForGoogleScript();

  const clientId = await getEffectiveClientId();
  if (!clientId) {
    throw new Error('Google OAuth Client ID is missing. Please enter your Client ID in Settings.');
  }

  return new Promise((resolve, reject) => {
    try {
      const client = window.google!.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: async (resp: TokenResponse) => {
          if (resp.error) {
            reject(new Error(resp.error_description || resp.error || 'Failed to authenticate with Google'));
            return;
          }
          if (!resp.access_token) {
            reject(new Error('No access token received from Google Identity Services'));
            return;
          }

          memoryAccessToken = resp.access_token;
          const expiresInSeconds = resp.expires_in || 3600;
          tokenExpiresAt = Date.now() + (expiresInSeconds - 60) * 1000;

          try {
            const profile = await fetchUserProfile(memoryAccessToken);
            currentUserProfile = profile;
            notifyAuthChange();
            resolve({ user: profile, token: memoryAccessToken });
          } catch (profileErr) {
            currentUserProfile = { email: 'Connected User' };
            notifyAuthChange();
            resolve({ user: currentUserProfile, token: memoryAccessToken });
          }
        },
        error_callback: (err) => {
          reject(err instanceof Error ? err : new Error(String(err)));
        },
      });

      tokenClientInstance = client;
      lastUsedClientId = clientId;

      client.requestAccessToken({ prompt: interactive ? 'select_account' : '' });
    } catch (err) {
      reject(err);
    }
  });
}

export async function signOut(): Promise<void> {
  if (memoryAccessToken && window.google?.accounts?.oauth2) {
    try {
      window.google.accounts.oauth2.revoke(memoryAccessToken, () => {});
    } catch {
    }
  }
  memoryAccessToken = null;
  tokenExpiresAt = 0;
  currentUserProfile = null;
  notifyAuthChange();
}

export function getCurrentUser(): UserProfile | null {
  return currentUserProfile;
}
