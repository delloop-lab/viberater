/// <reference types="vite/client" />
// Spotify API helper using Client Credentials flow
// Requires VITE_SPOTIFY_CLIENT_ID and VITE_SPOTIFY_CLIENT_SECRET to be set in environment.
// IMPORTANT: Exposing the client secret in the browser is NOT recommended for production.
// This is a quick demo helper only.

export interface SpotifyTrackInfo {
  id: string;
  name: string;
  artists: string;
  preview_url: string | null;
  external_url: string;
}

let cachedToken: string | null = null;
let tokenExpiry = 0; // epoch ms

async function fetchAccessToken(): Promise<string> {
  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined;
  const clientSecret = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET as string | undefined;

  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials are not set in the environment variables.');
  }

  // Return cached token if valid for at least 1 minute more
  if (cachedToken && Date.now() < tokenExpiry - 60_000) {
    return cachedToken;
  }

  const body = new URLSearchParams();
  body.append('grant_type', 'client_credentials');

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error('Failed to retrieve Spotify access token');
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000;
  return cachedToken;
}

export async function searchTrack(query: string): Promise<SpotifyTrackInfo | null> {
  try {
    const token = await fetchAccessToken();
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Spotify track search failed');
    }

    const data = await response.json();
    const track = data.tracks?.items?.[0];
    if (!track) return null;

    const info: SpotifyTrackInfo = {
      id: track.id,
      name: track.name,
      artists: track.artists.map((a: any) => a.name).join(', '),
      preview_url: track.preview_url,
      external_url: track.external_urls.spotify,
    };
    return info;
  } catch (err) {
    console.error(err);
    return null;
  }
} 