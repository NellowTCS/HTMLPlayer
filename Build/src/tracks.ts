import { v4 as uuidv4 } from 'uuid';
const sanitizeHtml = require('sanitize-html');
import { fileOpen } from 'browser-fs-access';
const jsmediatags = require('jsmediatags');
import { StoreApi, UseBoundStore } from 'zustand';
import { AppState } from './main';
import { saveTrack, loadTracks } from './storage';

export function initTracks(store: UseBoundStore<StoreApi<AppState>>) {
  const tracksEl = document.getElementById('trackList') as HTMLElement;
  const addingPopup = document.getElementById('addingPopup') as HTMLElement;

  const renderTracks = async () => {
    const tracks = await loadTracks();
    tracksEl.innerHTML = tracks
      .map((t) => `<div>${sanitizeHtml(t.title)}</div>`)
      .join('');
  };

  document.getElementById('addMusic')?.addEventListener('click', async () => {
    const files = await fileOpen({ mimeTypes: ['audio/*'], multiple: true });
    addingPopup.classList.remove('hidden');
    for (const file of files) {
      const id = uuidv4();
      const url = URL.createObjectURL(file);
      jsmediatags.read(file, {
        onSuccess: async (tag: any) => {
          await saveTrack({ id, url, title: tag.tags.title || file.name });
          renderTracks();
        },
        onError: async () => {
          await saveTrack({ id, url, title: file.name });
          renderTracks();
        },
      });
    }
    addingPopup.classList.add('hidden');
  });

  // Add bulk delete logic
  renderTracks();
}