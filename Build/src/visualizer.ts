import p5 from 'p5';
import { Howl } from 'howler';
import { StoreApi, UseBoundStore } from 'zustand';
import { AppState } from './main';
import { loadSettings } from './storage';

export function initVisualizer(store: UseBoundStore<StoreApi<AppState>>) {
  const canvas = document.getElementById('visualizer') as HTMLCanvasElement;
  let howl: Howl | null = null;

  const sketch = (p: p5) => {
    let analyser: AnalyserNode;
    p.setup = () => {
      p.createCanvas(canvas.offsetWidth, canvas.offsetHeight);
      const audioContext = howl?.howler?.context() as AudioContext;
      if (audioContext) {
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        howl?.howler?.connect(analyser);
      }
    };

    p.draw = async () => {
      const settings = await loadSettings();
      p.background(0);
      if (analyser && settings?.visualizerStyle === 'particles') {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);
        p.fill(255);
        for (let i = 0; i < bufferLength; i++) {
          const x = p.map(i, 0, bufferLength, 0, p.width);
          const y = p.map(dataArray[i], 0, 255, p.height, 0);
          p.circle(x, y, 5);
        }
      }
      // Add waveform, bars logic
    };

    p.windowResized = () => {
      p.resizeCanvas(canvas.offsetWidth, canvas.offsetHeight);
    };
  };

  store.subscribe((state) => {
    if (state.currentTrack && state.currentTrack !== howl?.src) {
      howl = new Howl({ src: [state.currentTrack], html5: true });
      new p5(sketch, canvas);
    }
  });
}