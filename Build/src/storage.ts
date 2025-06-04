import { openDB } from 'idb';
import DOMPurify from 'dompurify';

interface Playlist {
  id: string;
  name: string;
  art?: string;
}

interface Track {
  id: string;
  url: string;
  title: string;
  art?: string;
  rating?: number;
  deleted?: boolean;
}

interface Settings {
  theme: string;
  visualizerStyle: string;
  cacheEnabled: boolean;
}

// Open IndexedDB database
const dbPromise = openDB('HTMLPlayer', 2, {
  upgrade(db, oldVersion) {
    // Create initial stores if this is a new database
    if (oldVersion < 1) {
      db.createObjectStore('playlists', { keyPath: 'id' });
      db.createObjectStore('tracks', { keyPath: 'id' });
      db.createObjectStore('settings');
      db.createObjectStore('playback');
    }
    
    // Add audioblobs store in version 2
    if (oldVersion < 2) {
      db.createObjectStore('audioblobs');
    }
  },
});

// Playlist
export async function savePlaylist(playlist: Playlist) {
  const db = await dbPromise;
  await db.put('playlists', {
    ...playlist,
    name: DOMPurify.sanitize(playlist.name),
  });
}

export async function loadPlaylists(): Promise<Playlist[]> {
  const db = await dbPromise;
  return await db.getAll('playlists');
}

// Track
export async function saveTrack(track: Track) {
  const db = await dbPromise;
  await db.put('tracks', {
    ...track,
    title: DOMPurify.sanitize(track.title),
  });
}

export async function loadTracks(): Promise<Track[]> {
  const db = await dbPromise;
  const tracks = await db.getAll('tracks');
  return tracks.filter(track => !track.deleted);
}

// Settings
const DEFAULT_SETTINGS: Settings = {
  theme: 'default',
  visualizerStyle: 'particles',
  cacheEnabled: true
};

export async function saveSettings(settings: Settings) {
  const db = await dbPromise;
  await db.put('settings', settings, 'user-settings');
}

export async function loadSettings(): Promise<Settings> {
  const db = await dbPromise;
  const settings = await db.get('settings', 'user-settings');
  return settings || DEFAULT_SETTINGS;
}

// Playback Position
export async function savePlaybackPosition(trackId: string | null, position: number) {
  if (!trackId) return;
  const db = await dbPromise;
  await db.put('playback', position, trackId);
}

export async function loadPlaybackPosition(trackId: string | null): Promise<number | null> {
  if (!trackId) return null;
  const db = await dbPromise;
  return await db.get('playback', trackId);
}

// Audio blob caching
export async function cacheAudioBlob(url: string, blob: Blob): Promise<void> {
  const db = await dbPromise;
  await db.put('audioblobs', blob, url);
}

export async function getCachedAudioBlob(url: string): Promise<Blob | null> {
  try {
    const db = await dbPromise;
    return await db.get('audioblobs', url);
  } catch (error) {
    console.error('Error retrieving cached audio:', error);
    return null;
  }
}

// Blob URL management
const blobUrls = new Map<string, string>();

export async function getAudioBlobUrl(trackUrl: string): Promise<string> {
  // Check if we already have a blob URL for this track
  const existingBlobUrl = blobUrls.get(trackUrl);
  if (existingBlobUrl) {
    return existingBlobUrl;
  }

  // Try to get from cache or fetch new
  const settings = await loadSettings();
  let blob: Blob;

  if (settings.cacheEnabled) {
    const cachedBlob = await getCachedAudioBlob(trackUrl);
    if (cachedBlob) {
      blob = cachedBlob;
    } else {
      const response = await fetch(trackUrl);
      blob = await response.blob();
      await cacheAudioBlob(trackUrl, blob);
    }
  } else {
    const response = await fetch(trackUrl);
    blob = await response.blob();
  }

  // Create and store the blob URL
  const blobUrl = URL.createObjectURL(blob);
  blobUrls.set(trackUrl, blobUrl);
  return blobUrl;
}

export function revokeAudioBlobUrl(trackUrl: string): void {
  const blobUrl = blobUrls.get(trackUrl);
  if (blobUrl) {
    URL.revokeObjectURL(blobUrl);
    blobUrls.delete(trackUrl);
  }
}

// Handle cleanup of blob URLs when clearing cache
export async function clearAudioCache(): Promise<void> {
  const db = await dbPromise;
  await db.clear('audioblobs');
  
  // Cleanup all blob URLs
  for (const [trackUrl, blobUrl] of blobUrls.entries()) {
    URL.revokeObjectURL(blobUrl);
    blobUrls.delete(trackUrl);
  }
}

// Get the total size of cached audio blobs
export async function getAudioCacheSize(): Promise<number> {
  const db = await dbPromise;
  const keys = await db.getAllKeys('audioblobs');
  const blobs = await Promise.all(keys.map(key => db.get('audioblobs', key)));
  return blobs.reduce((total, blob) => total + (blob?.size || 0), 0);
}
