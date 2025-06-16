export async function searchTrack(songTitle: string): Promise<{ previewUrl: string; externalUrl: string } | null> {
  console.log('Searching for track:', songTitle);
  try {
    const apiKey = import.meta.env.VITE_LASTFM_API_KEY;
    console.log('API Key available:', !!apiKey);
    
    if (!apiKey) {
      console.error('Environment variables:', {
        VITE_LASTFM_API_KEY: import.meta.env.VITE_LASTFM_API_KEY,
        NODE_ENV: import.meta.env.MODE,
        envKeys: Object.keys(import.meta.env)
      });
      throw new Error('Missing Last.fm API key. Please check your .env file.');
    }

    const response = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=track.search&track=${encodeURIComponent(songTitle)}&api_key=${apiKey}&format=json&limit=5`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Last.fm API error:', response.status, errorData);
      throw new Error('Failed to search track');
    }

    const data = await response.json();
    console.log('Search results:', data);

    if (data.results?.trackmatches?.track?.length > 0) {
      const track = data.results.trackmatches.track[0];
      console.log('Found track:', {
        name: track.name,
        artist: track.artist,
        url: track.url
      });

      return {
        previewUrl: '',  // Last.fm doesn't provide preview URLs
        externalUrl: track.url
      };
    }

    console.log('No track found');
    return null;
  } catch (error) {
    console.error('Error searching track:', error);
    return null;
  }
} 