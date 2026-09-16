let enabled = true;
export function setSoundEnabled(value: boolean): void { enabled = value; }
export function playMoveSound(): void {
  if (!enabled) return;
  try {
    if(localStorage.getItem('jiso-reversi.sound')==='off')return;
    const context = new AudioContext(); const oscillator = context.createOscillator(); const gain = context.createGain();
    oscillator.frequency.value = 440; gain.gain.setValueAtTime(0.04, context.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.08);
    oscillator.connect(gain).connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + 0.08);
    oscillator.onended=()=>{void context.close();};
  } catch { /* 音声が利用できない環境では無音で継続 */ }
}
