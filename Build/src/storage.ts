import localforage from 'localforage';
import sanitize from 'sanitize-html';

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

localforage.config({ name: 'HTMLPlayer' });

export async function savePlaylist(playlist: Playlist) {
  await localforage.setItem(`playlist:${playlist.id}`, {
    ...playlist,
    name: sanitize(playlist.name),
  });
}

export async function loadPlaylists(): Promise<Playlist[]> {
  const playlists: Playlist[] = [];
  await localforage.iterate((value: Playlist, key) => {
    if (key.startsWith('playlist:')) playlists.push(value);
  });
  return playlists;
}

export async function saveTrack(track: Track) {
  await localforage.setItem(`track:${track.id}`, {
    ...track,
    title: sanitize(track.title),
  });
}

export async function loadTracks(): Promise<Track[]> {
  const tracks: Track[] = [];
  await localforage.iterate((value: Track, key) => {
    if (key.startsWith('track:')) tracks.push(value);
  });
  return tracks;
}

export async function saveSettings(settings: Settings) {
  await localforage.setItem('settings', settings);
}

export async function loadSettings(): Promise<Settings | null> {
  return await localforage.getItem('settings');
}

export async function savePlaybackPosition(trackId: string | null, position: number) {
  if (trackId) await localforage.setItem(`playback:${trackId}`, position);
}

export async function loadPlaybackPosition(trackId: string | null): Promise<number | null> {
  return trackId ? await localforage.getItem(`playback:${trackId}`) : null;
}