/** このゲーム用の短い旋律と音色。外部の録音・楽曲は使用しない。 */
export interface AudioSettings {
  sound: boolean;
  music: boolean;
  soundVolume: number;
  musicVolume: number;
}
export type SoundCue = 'place' | 'rotate' | 'chain' | 'victory';
const clamp = (value: number) => (Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.35);
const frequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

export class SynthAudio {
  private context?: AudioContext;
  private musicGain?: GainNode;
  private soundGain?: GainNode;
  private settings: AudioSettings = {
    sound: true,
    music: true,
    soundVolume: 0.55,
    musicVolume: 0.3,
  };
  private musicNodes = new Set<OscillatorNode>();
  private soundNodes = new Set<OscillatorNode>();
  private timer?: ReturnType<typeof setInterval>;
  private unlocked = false;
  private hidden = false;
  private playing = true;
  private nextTime = 0;
  private step = 0;
  private disposed = false;

  configure(settings: AudioSettings) {
    this.settings = {
      ...settings,
      soundVolume: clamp(settings.soundVolume),
      musicVolume: clamp(settings.musicVolume),
    };
    this.updateGains();
    if (!settings.sound || this.settings.soundVolume === 0) this.stopEffects();
    this.syncMusic();
  }
  /** ブラウザの再生制限に従い、クリックまたはキー操作から呼ぶ。 */
  async unlock() {
    if (this.disposed || this.hidden || (!this.settings.music && !this.settings.sound)) return;
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.musicGain = this.context.createGain();
        this.soundGain = this.context.createGain();
        const limiter = this.context.createDynamicsCompressor();
        this.musicGain.connect(limiter);
        this.soundGain.connect(limiter);
        limiter.connect(this.context.destination);
        this.updateGains();
      }
      await this.context.resume();
      if (this.disposed || this.hidden) return;
      this.unlocked = true;
      this.syncMusic();
    } catch {
      // 音声が禁止された環境でも対局を継続し、次の操作時に再試行する。
      this.unlocked = false;
    }
  }
  setPlaying(playing: boolean) {
    this.playing = playing;
    this.syncMusic();
  }
  async setHidden(hidden: boolean) {
    this.hidden = hidden;
    if (hidden) {
      this.stopMusic();
      this.stopEffects();
      await this.context?.suspend().catch(() => undefined);
    } else if (this.unlocked) await this.unlock();
  }
  private updateGains() {
    if (!this.context) return;
    this.musicGain!.gain.setTargetAtTime(
      this.settings.music ? this.settings.musicVolume : 0,
      this.context.currentTime,
      0.02,
    );
    this.soundGain!.gain.setTargetAtTime(
      this.settings.sound ? this.settings.soundVolume : 0,
      this.context.currentTime,
      0.02,
    );
  }
  private tone(
    midi: number,
    time: number,
    duration: number,
    volume: number,
    type: OscillatorType,
    music: boolean,
    endMidi?: number,
  ) {
    const context = this.context!;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const nodes = music ? this.musicNodes : this.soundNodes;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency(midi), time);
    if (endMidi !== undefined)
      oscillator.frequency.exponentialRampToValueAtTime(frequency(endMidi), time + duration);
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(volume, time + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    oscillator.connect(envelope).connect(music ? this.musicGain! : this.soundGain!);
    nodes.add(oscillator);
    oscillator.onended = () => {
      nodes.delete(oscillator);
      oscillator.disconnect();
      envelope.disconnect();
    };
    oscillator.start(time);
    oscillator.stop(time + duration + 0.02);
  }
  private syncMusic() {
    const allowed =
      !this.disposed &&
      this.unlocked &&
      !this.hidden &&
      this.playing &&
      this.settings.music &&
      this.settings.musicVolume > 0;
    if (!allowed) {
      this.stopMusic();
      return;
    }
    if (this.timer !== undefined || this.context?.state !== 'running') return;
    this.nextTime = this.context.currentTime + 0.04;
    this.step = 0;
    this.schedule();
    this.timer = setInterval(() => this.schedule(), 80);
  }
  private schedule() {
    if (!this.context || this.context.state !== 'running') return;
    // 110 BPM、4小節。低音・和音・アルペジオを短い先読みで重ねる。
    const seconds = 60 / 110 / 4;
    if (this.nextTime < this.context.currentTime) this.nextTime = this.context.currentTime + 0.02;
    const chords = [
      [57, 60, 64, 71],
      [53, 57, 60, 67],
      [60, 64, 67, 74],
      [55, 59, 62, 69],
    ];
    const pattern = [0, 2, 1, 3, 2, 1, 3, 2];
    while (this.nextTime < this.context.currentTime + 0.18) {
      const chord = chords[Math.floor(this.step / 16) % 4];
      const beat = this.step % 16;
      if (beat % 2 === 0)
        this.tone(chord[pattern[(beat / 2) % 8]] + 12, this.nextTime, 0.17, 0.055, 'sine', true);
      if (beat % 4 === 0) {
        this.tone(chord[0] - 24, this.nextTime, 0.34, 0.11, 'triangle', true);
        this.tone(43, this.nextTime, 0.09, 0.06, 'sine', true, 25);
      }
      if (beat === 0)
        chord
          .slice(0, 3)
          .forEach((note) => this.tone(note, this.nextTime, 1.5, 0.023, 'sine', true));
      this.nextTime += seconds;
      this.step = (this.step + 1) % 64;
    }
  }
  play(cue: SoundCue, chain = 1) {
    if (
      !this.context ||
      !this.unlocked ||
      this.hidden ||
      this.disposed ||
      !this.settings.sound ||
      this.settings.soundVolume === 0 ||
      this.context.state !== 'running'
    )
      return;
    const time = this.context.currentTime;
    if (cue === 'place') {
      this.tone(79, time, 0.075, 0.16, 'sine', false, 67);
      this.tone(91, time + 0.018, 0.09, 0.045, 'triangle', false);
    } else if (cue === 'rotate') {
      this.tone(48, time, 0.23, 0.09, 'triangle', false, 72);
      this.tone(67, time + 0.04, 0.2, 0.06, 'sine', false, 79);
    } else if (cue === 'chain') {
      const pitch = 72 + Math.min(7, Math.max(0, chain - 1)) * 2;
      this.tone(pitch, time, 0.15, 0.12, 'sine', false);
      this.tone(pitch + 7, time + 0.025, 0.14, 0.055, 'triangle', false);
    } else {
      [72, 76, 79, 84].forEach((note, index) =>
        this.tone(note, time + index * 0.095, 0.32, 0.11, 'sine', false),
      );
    }
  }
  private stopNodes(nodes: Set<OscillatorNode>) {
    for (const node of nodes) {
      node.stop();
      node.disconnect();
    }
    nodes.clear();
  }
  stopEffects() {
    this.stopNodes(this.soundNodes);
  }
  private stopMusic() {
    if (this.timer !== undefined) clearInterval(this.timer);
    this.timer = undefined;
    this.stopNodes(this.musicNodes);
  }
  dispose() {
    this.disposed = true;
    this.stopMusic();
    this.stopEffects();
    void this.context?.close().catch(() => undefined);
  }
}
