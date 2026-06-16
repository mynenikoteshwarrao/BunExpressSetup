/**
 * Hand-rolled Google OAuth2 (stateless, JWT-based) — replaces passport +
 * passport-google-oauth20 + express-session. This module owns only the OAuth2
 * protocol (consent URL + code exchange). The user upsert + JWT issuance is
 * handled by `authService.googleAuth(...)` (which the callback controller calls),
 * exactly as the Express `googleCallback` did — so there is no duplicate upsert.
 *
 * Gated on ENABLE_GOOGLE_AUTH=true (same as Express).
 */

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

export const isGoogleAuthEnabled = (): boolean =>
  process.env.ENABLE_GOOGLE_AUTH === 'true';

const getRedirectUri = (): string =>
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8000/api/auth/google/callback';

export interface GoogleProfile {
  id: string;
  email?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
}

/** Build the Google consent-screen URL to redirect the user to. */
export const getGoogleAuthUrl = (state?: string): string => {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent'
  });
  if (state) params.set('state', state);
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
};

/** Exchange an authorization code for the user's Google profile. */
export const exchangeCodeForProfile = async (code: string): Promise<GoogleProfile> => {
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirect_uri: getRedirectUri(),
      grant_type: 'authorization_code'
    }).toString()
  });

  if (!tokenRes.ok) {
    throw new Error('Failed to exchange Google authorization code');
  }

  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  if (!tokenJson.access_token) {
    throw new Error('Google token response missing access_token');
  }

  const userRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` }
  });

  if (!userRes.ok) {
    throw new Error('Failed to fetch Google user profile');
  }

  const info = (await userRes.json()) as {
    id: string;
    email?: string;
    name?: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
  };

  return {
    id: info.id,
    email: info.email,
    displayName: info.name,
    firstName: info.given_name,
    lastName: info.family_name,
    picture: info.picture
  };
};
