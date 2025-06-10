import { create } from "zustand";
import { initPlayer } from "./player";
import { initSettings } from "./settings";
import { initPlaylists } from "./playlists";
import { initTracks } from "./tracks";
import { initUI } from "./ui";
import { VisualizerManager } from "./visualizerManager";
import { roundedRectangle } from "./Components/roundedRectangle";

export interface AppState {
  currentTrack: string | null;
  isPlaying: boolean;
  theme: string;
  setCurrentTrack: (track: string | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setTheme: (theme: string) => void;
}

const useStore = create<AppState>((set) => ({
  currentTrack: null,
  isPlaying: false,
  theme: "default",
  setCurrentTrack: (track) => set({ currentTrack: track }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setTheme: (theme) => set({ theme }),
}));

// Enhanced visualizer wrapper to work with Howl.js
class HowlVisualizerAdapter {
  private visualizerManager: any = null; // VisualizerManager instance
  private howlInstance: any = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;

  constructor(canvasContainer: HTMLElement) {
    // We'll initialize the visualizer manager when we get a Howl instance
    this.setupCanvasContainer(canvasContainer);
  }

  private setupCanvasContainer(container: HTMLElement) {
    // Ensure container has proper styling for visualizer
    if (!container.style.position) {
      container.style.position = "relative";
    }
  }

  public setHowlInstance(howl: any) {
    this.howlInstance = howl;
    this.setupVisualizerConnection();
  }

  public setupVisualizerConnection() {
    if (!this.howlInstance) return;

    try {
      // Get the underlying HTML audio element from Howl
      const audioElement = this.getAudioElementFromHowl();

      if (audioElement && !this.visualizerManager) {
        const canvasContainer = document.getElementById("visualizer-container");
        if (canvasContainer) {
          // Now we can create the VisualizerManager with the audio element
          this.visualizerManager = new VisualizerManager(
            audioElement,
            canvasContainer
          );
          console.log(
            "Visualizer manager would be created here with audio element"
          );

          // For now, let's set up Web Audio API connection manually
          // this.setupWebAudioConnection(audioElement);
        }
      }
    } catch (error) {
      console.error("Error setting up visualizer connection:", error);
    }
  }

  private getAudioElementFromHowl(): HTMLAudioElement | null {
    try {
      // Access the internal HTML audio element from Howl
      if (
        this.howlInstance &&
        this.howlInstance._sounds &&
        this.howlInstance._sounds[0]
      ) {
        return this.howlInstance._sounds[0]._node;
      }
    } catch (error) {
      console.error("Error accessing audio element from Howl:", error);
    }
    return null;
  }

  private setupWebAudioConnection(audioElement: HTMLAudioElement) {
    try {
      // Use Howler's existing audio context if available
      this.audioContext =
        (window as any).Howler?.ctx ||
        new (window.AudioContext || (window as any).webkitAudioContext)();

      if (!this.analyser) {
        if (!this.audioContext) {
          console.error("AudioContext is not available");
          return;
        }
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;

        // Create source from audio element
        this.source = this.audioContext.createMediaElementSource(audioElement);
        this.source.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);

        console.log("Web Audio API connection established for visualizer");
      }
    } catch (error) {
      console.error("Error setting up Web Audio API:", error);
    }
  }

  public setVisualizerType(type: string) {
    if (this.visualizerManager) {
      this.visualizerManager.addVisualizer(type);
    } else {
      console.warn("Visualizer manager not initialized yet");
    }
  }

  public updateSettings(settings: any) {
    // Handle visualizer settings updates
    console.log("Updating visualizer settings:", settings);
  }

  public getAnalyserNode(): AnalyserNode | null {
    return this.analyser;
  }

  public getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  public destroy() {
    if (this.visualizerManager) {
      // Clean up visualizer manager
      this.visualizerManager = null;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
  }
}

// UI Component Creation Functions
function createRoundedUIComponents() {
  // Create playlist cards container with rounded rectangles
  setupPlaylistCards();

  // Create track items with rounded rectangles
  setupTrackItems();

  // Create control buttons with rounded rectangles
  setupControlButtons();

  // Create progress bar with rounded rectangle
  setupProgressBar();

  // Create volume control with rounded rectangle
  setupVolumeControl();

  // Create visualizer container with rounded rectangle
  setupVisualizerContainer();

  // Create modals and popups with rounded rectangles
  setupModalsAndPopups();

  // Create upload button with rounded rectangle
  setupUploadButton();
}

function setupPlaylistCards() {
  const playlistContainer = document.getElementById("playlistContainer");
  if (!playlistContainer) return;

  // Create example playlist cards (these would be dynamically generated)
  const playlistNames = ["Favorites", "Recently Added", "Rock", "Electronic"];

  playlistNames.forEach((name, index) => {
    const playlistCard = new roundedRectangle({
      width: 250,
      height: 60,
      radius: 12,
      backgroundColor: "#4a5568",
      className: "playlist-card",
    });

    // Add content to the card
    playlistCard.domElement.innerHTML = `
      <div style="display: flex; align-items: center; padding: 0 16px; height: 100%; color: white;">
        <div style="width: 40px; height: 40px; background: #2d3748; border-radius: 8px; margin-right: 12px; display: flex; align-items: center; justify-content: center;">
          🎵
        </div>
        <div>
          <div style="font-weight: bold;">${name}</div>
          <div style="font-size: 12px; opacity: 0.7;">${
            Math.floor(Math.random() * 50) + 5
          } tracks</div>
        </div>
      </div>
    `;

    // Add hover and click effects
    playlistCard.onHover(
      () => playlistCard.updateColors("#5a6575"),
      () => playlistCard.updateColors("#4a5568")
    );

    playlistCard.onClick(() => {
      // Remove selection from other cards
      document.querySelectorAll(".playlist-card").forEach((card) => {
        card.classList.remove("selected");
      });
      playlistCard.domElement.classList.add("selected");
      console.log(`Selected playlist: ${name}`);
    });

    playlistCard.appendTo(playlistContainer);
  });
}

function setupTrackItems() {
  const trackContainer = document.getElementById("trackContainer");
  if (!trackContainer) return;

  // Create example track items (these would be dynamically generated)
  const tracks = [
    { title: "Song One", artist: "Artist A", duration: "3:45" },
    { title: "Song Two", artist: "Artist B", duration: "4:12" },
    { title: "Song Three", artist: "Artist C", duration: "2:58" },
    { title: "Song Four", artist: "Artist D", duration: "5:23" },
  ];

  tracks.forEach((track, index) => {
    const trackItem = new roundedRectangle({
      width: 300,
      height: 50,
      radius: 8,
      backgroundColor: "#2d3748",
      className: "track-item",
    });

    trackItem.domElement.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 0 12px; height: 100%; color: white;">
        <div style="display: flex; align-items: center;">
          <div style="margin-right: 12px; width: 20px; text-align: center; font-size: 12px; opacity: 0.7;">
            ${index + 1}
          </div>
          <div>
            <div style="font-weight: bold; font-size: 14px;">${
              track.title
            }</div>
            <div style="font-size: 12px; opacity: 0.7;">${track.artist}</div>
          </div>
        </div>
        <div style="font-size: 12px; opacity: 0.7;">
          ${track.duration}
        </div>
      </div>
    `;

    trackItem.onHover(
      () => trackItem.updateColors("#4a5568"),
      () => trackItem.updateColors("#2d3748")
    );

    trackItem.onClick(() => {
      // Remove current/selected from other tracks
      document.querySelectorAll(".track-item").forEach((item) => {
        item.classList.remove("current", "selected");
      });
      trackItem.domElement.classList.add("current");
      console.log(`Playing track: ${track.title}`);
    });

    trackItem.appendTo(trackContainer);
  });
}

function setupControlButtons() {
  const trackControls = document.getElementById("trackControls");
  if (!trackControls) return;

  const controls = [
    { text: "Select All", icon: "☑️" },
    { text: "Delete", icon: "🗑️" },
    { text: "Add to Playlist", icon: "➕" },
    { text: "Sort", icon: "🔄" },
  ];

  controls.forEach((control) => {
    const controlBtn = new roundedRectangle({
      width: 100,
      height: 35,
      radius: 8,
      backgroundColor: "#3182ce",
      className: "control-button",
    });

    controlBtn.domElement.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: white; font-size: 12px; font-weight: bold;">
        ${control.icon} ${control.text}
      </div>
    `;

    controlBtn.onHover(
      () => controlBtn.updateColors("#2c5aa0"),
      () => controlBtn.updateColors("#3182ce")
    );

    controlBtn.onClick(() => {
      console.log(`${control.text} clicked`);
    });

    controlBtn.appendTo(trackControls);
  });
}

function setupProgressBar() {
  const progressContainer = document.getElementById("progressContainer");
  if (!progressContainer) return;

  const progressBarBg = new roundedRectangle({
    width: 400,
    height: 6,
    radius: 3,
    backgroundColor: "#4a5568",
    className: "progress-bar",
  });

  const progressBarFill = new roundedRectangle({
    width: 120, // This would be dynamic based on current progress
    height: 6,
    radius: 3,
    backgroundColor: "#3182ce",
  });

  progressBarFill.domElement.style.position = "absolute";
  progressBarFill.domElement.style.top = "0";
  progressBarFill.domElement.style.left = "0";

  progressBarBg.domElement.style.position = "relative";
  progressBarBg.domElement.appendChild(progressBarFill.domElement);

  progressBarBg.onClick((e) => {
    const rect = progressBarBg.domElement.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newWidth = rect.width * percentage;
    progressBarFill.updateSize(newWidth, 6);
    console.log(`Progress set to: ${(percentage * 100).toFixed(1)}%`);
  });

  progressBarBg.appendTo(progressContainer);
}

function setupVolumeControl() {
  const volumeSliderContainer = document.getElementById(
    "volumeSliderContainer"
  );
  if (!volumeSliderContainer) return;

  const volumeSliderBg = new roundedRectangle({
    width: 100,
    height: 4,
    radius: 2,
    backgroundColor: "#4a5568",
    className: "volume-control",
  });

  const volumeSliderFill = new roundedRectangle({
    width: 50, // 50% volume
    height: 4,
    radius: 2,
    backgroundColor: "#3182ce",
  });

  volumeSliderFill.domElement.style.position = "absolute";
  volumeSliderFill.domElement.style.top = "0";
  volumeSliderFill.domElement.style.left = "0";

  volumeSliderBg.domElement.style.position = "relative";
  volumeSliderBg.domElement.appendChild(volumeSliderFill.domElement);

  volumeSliderBg.onClick((e) => {
    const rect = volumeSliderBg.domElement.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newWidth = rect.width * percentage;
    volumeSliderFill.updateSize(newWidth, 4);
    console.log(`Volume set to: ${(percentage * 100).toFixed(1)}%`);
  });

  // Replace the existing slider
  const existingSlider = document.getElementById("volumeSlider");
  if (existingSlider) {
    existingSlider.style.display = "none";
  }

  volumeSliderBg.appendTo(volumeSliderContainer);
}

function setupVisualizerContainer() {
  const visualizerWrapper = document.getElementById(
    "visualizer-container-wrapper"
  );
  if (!visualizerWrapper) return;

  const visualizerFrame = new roundedRectangle({
    width: 600,
    height: 200,
    radius: 16,
    backgroundColor: "#1a202c",
    borderColor: "#4a5568",
    borderWidth: 2,
    className: "visualizer-frame",
  });

  // Create the actual visualizer container inside the frame
  const visualizerContainer = document.createElement("div");
  visualizerContainer.id = "visualizer-container";
  visualizerContainer.style.cssText = `
    width: 100%;
    height: 100%;
    border-radius: 14px;
    overflow: hidden;
    background: linear-gradient(45deg, #1a202c, #2d3748);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #a0aec0;
    font-size: 14px;
  `;
  visualizerContainer.textContent = "Visualizer will appear here";

  visualizerFrame.domElement.appendChild(visualizerContainer);
  visualizerFrame.appendTo(visualizerWrapper);
}

function setupModalsAndPopups() {
  // Setup adding popup
  const addingPopup = document.getElementById("addingPopup");
  if (addingPopup) {
    const addingCard = new roundedRectangle({
      width: 300,
      height: 150,
      radius: 16,
      backgroundColor: "#2d3748",
      className: "notification-card",
    });

    addingCard.domElement.innerHTML = `
      <div style="padding: 24px; text-align: center; color: white;">
        <div style="font-size: 18px; font-weight: bold; margin-bottom: 12px;">Adding Music</div>
        <div style="opacity: 0.8;">Please wait while we process your files...</div>
        <div style="margin-top: 16px;">
          <div style="width: 200px; height: 4px; background: #4a5568; border-radius: 2px; margin: 0 auto; position: relative;">
            <div style="width: 60%; height: 100%; background: #3182ce; border-radius: 2px; animation: pulse 1.5s ease-in-out infinite;"></div>
          </div>
        </div>
      </div>
    `;

    addingPopup.appendChild(addingCard.domElement);
  }

  // Setup processing popup
  const processingPopup = document.getElementById("processingPopup");
  if (processingPopup) {
    const processingCard = new roundedRectangle({
      width: 300,
      height: 150,
      radius: 16,
      backgroundColor: "#2d3748",
      className: "notification-card",
    });

    processingCard.domElement.innerHTML = `
      <div style="padding: 24px; text-align: center; color: white;">
        <div style="font-size: 18px; font-weight: bold; margin-bottom: 12px;">Processing</div>
        <div style="opacity: 0.8;">Analyzing audio files...</div>
        <div style="margin-top: 16px;">⚡ Working...</div>
      </div>
    `;

    processingPopup.appendChild(processingCard.domElement);
  }

  // Setup playlist name modal
  const playlistNameModal = document.getElementById("playlistNameModal");
  if (playlistNameModal) {
    const playlistModalCard = new roundedRectangle({
      width: 350,
      height: 200,
      radius: 16,
      backgroundColor: "#2d3748",
      className: "modal-card",
    });

    playlistModalCard.domElement.innerHTML = `
      <div style="padding: 24px; color: white;">
        <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: bold;">Create Playlist</h3>
        <input type="text" placeholder="Enter playlist name..." style="width: 100%; padding: 12px; border: none; border-radius: 8px; background: #4a5568; color: white; margin-bottom: 16px;">
        <div style="display: flex; justify-content: flex-end; gap: 12px;">
          <button style="padding: 8px 16px; border: none; border-radius: 6px; background: #4a5568; color: white; cursor: pointer;">Cancel</button>
          <button style="padding: 8px 16px; border: none; border-radius: 6px; background: #3182ce; color: white; cursor: pointer;">Create</button>
        </div>
      </div>
    `;

    playlistNameModal.appendChild(playlistModalCard.domElement);
  }
}

function setupUploadButton() {
  const uploadButtonContainer = document.getElementById(
    "uploadButtonContainer"
  );
  if (!uploadButtonContainer) return;

  const uploadBtn = new roundedRectangle({
    width: 200,
    height: 50,
    radius: 12,
    backgroundColor: "#38a169",
    className: "control-button",
  });

  uploadBtn.domElement.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: white; font-weight: bold;">
      📁 Add Music
    </div>
  `;

  uploadBtn.onHover(
    () => uploadBtn.updateColors("#2f855a"),
    () => uploadBtn.updateColors("#38a169")
  );

  uploadBtn.onClick(async () => {
    if ("showDirectoryPicker" in window) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker();
        const event = new CustomEvent("music-directory-selected", {
          detail: dirHandle,
        });
        window.dispatchEvent(event);
      } catch (e) {
        const fileInput = document.getElementById(
          "fileInput"
        ) as HTMLInputElement;
        if (fileInput) fileInput.click();
      }
    } else {
      console.warn(
        "Directory picker not supported, falling back to file input"
      );
      const fileInput = document.getElementById(
        "fileInput"
      ) as HTMLInputElement;
      if (fileInput) {
        fileInput.setAttribute("multiple", "true");
        fileInput.setAttribute("accept", "audio/*");
        fileInput.click();
      }
    }
  });

  // Replace existing upload button
  const existingUploadBtn = document.getElementById("uploadBtn");
  if (existingUploadBtn) {
    existingUploadBtn.style.display = "none";
  }

  uploadBtn.appendTo(uploadButtonContainer);
}

function setupPlaylistControls() {
  const playlistButtons = document.getElementById("playlistButtons");
  if (!playlistButtons) return;

  const buttons = [
    { text: "New", icon: "➕", color: "#3182ce" },
    { text: "Edit", icon: "✏️", color: "#ed8936" },
    { text: "Delete", icon: "🗑️", color: "#e53e3e" },
  ];

  buttons.forEach((button) => {
    const btn = new roundedRectangle({
      width: 80,
      height: 35,
      radius: 8,
      backgroundColor: button.color,
      className: "control-button",
    });

    btn.domElement.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: white; font-size: 12px; font-weight: bold;">
        ${button.icon} ${button.text}
      </div>
    `;

    btn.onHover(
      () => {
        const darkerColor = button.color.replace(/[0-9a-f]{2}$/, (match) =>
          Math.max(0, parseInt(match, 16) - 30)
            .toString(16)
            .padStart(2, "0")
        );
        btn.updateColors(darkerColor);
      },
      () => btn.updateColors(button.color)
    );

    btn.onClick(() => {
      console.log(`${button.text} playlist button clicked`);
    });

    btn.appendTo(playlistButtons);
  });
}

async function initApp() {
  // Initialize other components first
  initUI(useStore);
  initSettings(useStore);
  initPlaylists(useStore);
  initTracks(useStore);

  // Initialize player
  const playerInstance = initPlayer(useStore);

  // Initialize visualizer adapter
  const visualizerContainer = document.getElementById("visualizer-container");
  if (visualizerContainer && playerInstance) {
    const visualizerAdapter = new HowlVisualizerAdapter(visualizerContainer);

    // Connect the visualizer adapter to the player
    if (typeof playerInstance.setVisualizerInstance === "function") {
      playerInstance.setVisualizerInstance(visualizerAdapter);
      console.log("Visualizer adapter connected to audio player");
    }

    // Set up visualizer controls
    setupVisualizerControls(visualizerAdapter);
  }

  // Create all rounded UI components
  createRoundedUIComponents();

  // Setup playlist controls
  setupPlaylistControls();

  // Setup original add music button functionality
  setupAddMusicButton();

  // Keyboard controls
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && e.target === document.body) {
      e.preventDefault();
      const playPauseBtn = document.getElementById("playPauseBtn");
      if (playPauseBtn) {
        playPauseBtn.click();
      }
    }
  });

  // Handle window resize for visualizer
  window.addEventListener("resize", () => {
    // If you have a visualizer manager, call its resize method
    // visualizerManager?.resizeCanvas();
  });

  console.log("Music player initialized with rounded rectangle UI components");
}

function setupVisualizerControls(visualizerAdapter: HowlVisualizerAdapter) {
  // Example: Add buttons to switch visualizer types
  const visualizerButtons = document.querySelectorAll("[data-visualizer-type]");

  visualizerButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const type = target.dataset.visualizerType;
      if (type) {
        visualizerAdapter.setVisualizerType(type);

        // Update button states
        visualizerButtons.forEach((btn) => btn.classList.remove("active"));
        target.classList.add("active");
      }
    });
  });
}

// Directory picker + file input fallback for Add Music
function setupAddMusicButton() {
  const uploadBtn = document.getElementById("uploadBtn");
  const fileInput = document.getElementById("fileInput") as HTMLInputElement;

  if (!uploadBtn || !fileInput) return;

  uploadBtn.addEventListener("click", async () => {
    if ("showDirectoryPicker" in window) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker();
        const event = new CustomEvent("music-directory-selected", {
          detail: dirHandle,
        });
        window.dispatchEvent(event);
      } catch (e) {
        fileInput.click();
      }
    } else {
      console.warn(
        "Directory picker not supported, falling back to file input"
      );
      fileInput.setAttribute("multiple", "true");
      fileInput.setAttribute("accept", "audio/*");
      fileInput.click();
    }
  });
}

// Initialize the app
initApp();
