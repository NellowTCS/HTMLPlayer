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
}

interface Settings {
  theme: string;
  visualizerStyle: string;
}

// Open IndexedDB database
const dbPromise = openDB('HTMLPlayer', 1, {
  upgrade(db) {
    db.createObjectStore('playlists', { keyPath: 'id' });
    db.createObjectStore('tracks', { keyPath: 'id' });
    db.createObjectStore('settings');
    db.createObjectStore('playback');
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
  return await db.getAll('tracks');
}

// Settings
export async function saveSettings(settings: Settings) {
  const db = await dbPromise;
  await db.put('settings', settings, 'user-settings');
}

export async function loadSettings(): Promise<Settings | null> {
  const db = await dbPromise;
  return await db.get('settings', 'user-settings');
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
