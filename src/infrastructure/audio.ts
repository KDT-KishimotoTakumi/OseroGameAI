import { SynthAudio, type AudioSettings, type SoundCue } from './synth-audio';

const engine = new SynthAudio();
let settings: AudioSettings = { sound: true, music: true, soundVolume: 0.55, musicVolume: 0.3 };
export function configureAudio(value: AudioSettings) {
  settings = { ...value };
  engine.configure(settings);
}
export const unlockAudio = () => engine.unlock();
export const setAudioHidden = (hidden: boolean) => engine.setHidden(hidden);
export const setMusicPlaying = (playing: boolean) => engine.setPlaying(playing);
export const playGameSound = (cue: SoundCue, chain?: number) => engine.play(cue, chain);
export const stopGameSounds = () => engine.stopEffects();
export const disposeAudio = () => engine.dispose();
export function setSoundEnabled(sound: boolean) {
  configureAudio({ ...settings, sound });
}
export function playMoveSound() {
  engine.play('place');
}
if (import.meta.hot) import.meta.hot.dispose(disposeAudio);
