import * as p5 from 'p5';
import * as howlerimport from 'howler';
const { Howl } = howlerimport;
import { StoreApi, UseBoundStore } from 'zustand';
import { AppState } from './main';
import { loadSettings } from './storage';

export function initVisualizer(store: UseBoundStore<StoreApi<AppState>>) {
  const canvas = document.getElementById('visualizer') as HTMLCanvasElement;
  let howl: Howl | null = null;

  const sketch = (p: p5) => {
    let analyser: AnalyserNode | undefined;

    p.setup = () => {
      p.createCanvas(canvas.offsetWidth, canvas.offsetHeight, canvas);
      const audioContext = (howl as any)?._sounds[0]?._node?.context as AudioContext | undefined;
      if (audioContext) {
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        (howl as any)?._sounds[0]?._node?.connect(analyser);
        analyser.connect(audioContext.destination);
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
          const x = p.map(i, 0, bufferLength, 0, p.width, true);
          const y = p.map(dataArray[i], 0, 255, p.height, 0, true);
          p.circle(x, y, 5);
        }
      }
    };

    p.windowResized = () => {
      p.resizeCanvas(canvas.offsetWidth, canvas.offsetHeight, true);
    };
  };

  let sketchInstance: p5 | null = null;

  store.subscribe((state) => {
    if (state.currentTrack && state.currentTrack !== (howl as any)?.src) {
      if (howl) {
      howl.stop();
      howl.unload();
      }
      howl = new Howl({ src: [state.currentTrack], html5: true });

      if (sketchInstance) {
      sketchInstance.remove();
      }
      // Use namespace import for p5
      sketchInstance = new (p5 as any)(sketch, canvas);
    }
  });
}
