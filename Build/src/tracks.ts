import { v4 as uuidv4 } from 'uuid';
import DOMPurify from 'dompurify';
import { fileOpen } from 'browser-fs-access';
import { parseBlob } from 'music-metadata';
import { StoreApi, UseBoundStore } from 'zustand';
import { AppState } from './main';
import { saveTrack, loadTracks } from './storage';

export function initTracks(store: UseBoundStore<StoreApi<AppState>>) {
  const tracksEl = document.getElementById('trackList') as HTMLElement;
  const addingPopup = document.getElementById('addingPopup') as HTMLElement;

  const renderTracks = async () => {
    const tracks = await loadTracks();
    tracksEl.innerHTML = tracks
      .map((t) => `<div>${DOMPurify.sanitize(t.title)}</div>`)
      .join('');
  };

  document.getElementById('addMusic')?.addEventListener('click', async () => {
    const files = await fileOpen({ mimeTypes: ['audio/*'], multiple: true });
    addingPopup.classList.remove('hidden');

    for (const file of files) {
      const id = uuidv4();
      const url = URL.createObjectURL(file);

      try {
        const metadata = await parseBlob(file);
        const title = metadata.common.title || file.name;

        await saveTrack({ id, url, title });
      } catch (error) {
        console.warn('Failed to read metadata, falling back to file name:', error);
        await saveTrack({ id, url, title: file.name });
      }
    }

    await renderTracks();
    addingPopup.classList.add('hidden');
  });

  renderTracks();
}
