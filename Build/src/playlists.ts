import { v4 as uuidv4 } from 'uuid';
import DOMPurify from 'dompurify';
import { fileOpen } from 'browser-fs-access';
import { StoreApi, UseBoundStore } from 'zustand';
import { AppState } from './main';
import { savePlaylist, loadPlaylists } from './storage';

export function initPlaylists(store: UseBoundStore<StoreApi<AppState>>) {
  const playlistsEl = document.getElementById('playlists') as HTMLElement;

  const renderPlaylists = async () => {
    const playlists = await loadPlaylists();
    playlistsEl.innerHTML = playlists
      .map((p) => `<div>${DOMPurify.sanitize(p.name)} <img src="${p.art || ''}" loading="lazy"></div>`)
      .join('');
  };

  document.getElementById('addPlaylist')?.addEventListener('click', async () => {
    const name = prompt('Playlist name?');
    if (name) {
      await savePlaylist({ id: uuidv4(), name: DOMPurify.sanitize(name) });
      renderPlaylists();
    }
  });

  document.getElementById('setPlaylistArt')?.addEventListener('click', async () => {
    const file = await fileOpen({ mimeTypes: ['image/*'] });
    const url = URL.createObjectURL(file);
    // Update playlist art logic
    renderPlaylists();
  });

  // Add bulk delete logic
  renderPlaylists();
}