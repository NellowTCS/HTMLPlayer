import { v4 as uuidv4 } from "uuid";
import DOMPurify from "dompurify";
import { fileOpen } from "browser-fs-access";
import { StoreApi, UseBoundStore } from "zustand";
import { AppState } from "./main";
import { savePlaylist, loadPlaylists } from "./storage";

export function initPlaylists(store: UseBoundStore<StoreApi<AppState>>) {
  const playlistsEl = document.getElementById(
    "playlistContainer"
  ) as HTMLElement;

  // Modal Elements for playlist name input
  const modal = document.getElementById("playlistNameModal") as HTMLElement;
  const input = document.getElementById(
    "playlistNameInput"
  ) as HTMLInputElement;
  const saveBtn = document.getElementById("savePlaylistNameBtn") as HTMLElement;
  const cancelBtn = document.getElementById(
    "cancelPlaylistNameBtn"
  ) as HTMLElement;

  const renderPlaylists = async () => {
    const playlists = await loadPlaylists();
    playlistsEl.innerHTML = playlists
      .map(
        (p) =>
          `<li>${DOMPurify.sanitize(p.name)} <img src="${
            p.art || ""
          }" loading="lazy"></li>`
      )
      .join("");
  };

  const showModal = () => {
    modal.classList.remove("hidden");
    input.value = "";
    input.focus();
  };

  const hideModal = () => {
    modal.classList.add("hidden");
  };

  // Show modal on button click
  document.getElementById("addPlaylist")?.addEventListener("click", () => {
    showModal();
  });

  // Save playlist on modal Save button
  saveBtn.addEventListener("click", async () => {
    const name = input.value.trim();
    if (name) {
      await savePlaylist({ id: uuidv4(), name: DOMPurify.sanitize(name) });
      await renderPlaylists();
    }
    hideModal();
  });

  // Cancel modal
  cancelBtn.addEventListener("click", () => {
    hideModal();
  });

  // Set playlist art logic stays the same
  document
    .getElementById("setPlaylistArt")
    ?.addEventListener("click", async () => {
      const file = await fileOpen({ mimeTypes: ["image/*"] });
      const url = URL.createObjectURL(file);
      // TODO: Update playlist art for selected playlist
      await renderPlaylists();
    });

  renderPlaylists();
}
