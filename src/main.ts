import './presentation/styles.css';
import './presentation/rpg.css';
import './presentation/remix.css';
import { RemixSession } from './application/remix-session';
import { TurnNotice } from './application/turn-notice';
import { available, sameCommand } from './domain/remix-match';
import { other, type RemixMatch, type RemixCommand, type Quadrant } from './domain/remix-types';
import { quadrantOf } from './domain/remix-board';
import { difficultySettings, type RemixAiLevel as AiLevel } from './ai/remix-search';
import { boardMarkup, hpMarkup, playerName } from './presentation/remix-board';
import { playRemixAttack } from './presentation/remix-animation';
import { PRACTICE, lessonSuccess } from './presentation/remix-tutorial';
import {
  GUIDE_STEPS,
  markGuideSeen,
  moveGuideStep,
  shouldShowGuide,
} from './presentation/onboarding';
import {
  readRemixReplays,
  saveRemixReplay,
  type RemixReplay,
  type RemixFrame,
} from './infrastructure/remix-replays';
import {
  configureAudio,
  unlockAudio,
  setAudioHidden,
  setMusicPlaying,
  playGameSound,
  stopGameSounds,
} from './infrastructure/audio';

const app = document.querySelector<HTMLDivElement>('#app')!;
const live = new RemixSession();
const turnNotice = new TurnNotice();
let frames: RemixFrame[] = [{ match: structuredClone(live.match) }];
let input: 'cell' | 'rotate' = 'cell',
  quadrant: Quadrant | null = null,
  direction: 'right' | 'left' = 'right';
let level: AiLevel = 'standard',
  worker: Worker | undefined,
  animation: AbortController | undefined;
let practice: {
  index: number;
  session: RemixSession;
  success: boolean;
  cancelled: boolean;
} | null = null;
let replay: RemixReplay | null = null,
  replayIndex = 0,
  records = readRemixReplays();
let notice = '',
  attackStatus = '石を置くか、区画を回すかを選んでください。';
let sound = true,
  music = true,
  soundVolume = 0.55,
  musicVolume = 0.3,
  motion = false,
  duration = 'standard';
try {
  const settings = JSON.parse(localStorage.getItem('jiso.settings') ?? '{}');
  sound = settings.sound ?? true;
  music = settings.music ?? sound;
  soundVolume =
    typeof settings.soundVolume === 'number'
      ? Math.max(0, Math.min(1, settings.soundVolume))
      : 0.55;
  musicVolume =
    typeof settings.musicVolume === 'number' ? Math.max(0, Math.min(1, settings.musicVolume)) : 0.3;
  motion = settings.motion ?? false;
  duration = settings.duration ?? 'standard';
} catch {
  notice = '設定を初期化しました';
}
const storage = (() => {
  try {
    return localStorage;
  } catch {
    return null;
  }
})();
// 初回ガイド表示中は手番案内とAIを止め、閉じてから対局を進める。
let guide: number | null = shouldShowGuide(storage) ? 0 : null;
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
  );
const currentSession = () => practice?.session ?? live;
function stop() {
  stopGameSounds();
  worker?.terminate();
  worker = undefined;
  animation?.abort();
  animation = undefined;
}
function interrupt() {
  turnNotice.cancel();
  stop();
  live.interrupt();
  practice?.session.interrupt();
}
function saveSettings() {
  configureAudio({ sound, music, soundVolume, musicVolume });
  try {
    localStorage.setItem(
      'jiso.settings',
      JSON.stringify({ sound, music, soundVolume, musicVolume, motion, duration }),
    );
    localStorage.setItem('jiso-reversi.sound', sound ? 'on' : 'off');
  } catch {
    notice = '設定を保存できませんでした';
  }
}
function start(mode = live.mode, rematch = false, first = live.match.firstPlayer) {
  interrupt();
  live.start(mode, rematch, first);
  frames = [{ match: structuredClone(live.match) }];
  practice = null;
  replay = null;
  input = 'cell';
  quadrant = null;
  notice = '';
  attackStatus = '新しい対局を開始しました';
  render();
}
function lesson(index: number) {
  interrupt();
  const session = new RemixSession();
  session.match = structuredClone(PRACTICE[index].start);
  practice = { index, session, success: false, cancelled: false };
  replay = null;
  input = 'cell';
  quadrant = null;
  notice = '';
  attackStatus = '練習の説明に沿って操作してください';
  render();
}
function closeGuide() {
  guide = null;
  markGuideSeen(storage);
  window.scrollTo(0, 0);
}
function select(command: RemixCommand) {
  const session = currentSession();
  if (
    turnNotice.active ||
    session.busy ||
    replay ||
    session.match.winner !== null ||
    practice?.success
  )
    return;
  try {
    session.select(command);
    notice = '';
    render();
  } catch (error) {
    notice = (error as Error).message;
    render();
  }
}
async function confirm() {
  const session = currentSession(),
    training = practice;
  if (turnNotice.active || session.busy || !session.selection || replay) return;
  if (
    training &&
    !lessonSuccess(PRACTICE[training.index], session.selection.command, training.cancelled)
  ) {
    notice =
      training.index === 2 && !training.cancelled
        ? '一度「取り消す」を押してから、もう一度左回りを選んでください。'
        : '練習の説明にあるマス・区画・方向を選んでください。やり直しもできます。';
    render();
    return;
  }
  const before = structuredClone(session.match);
  try {
    const result = session.confirm(),
      generation = session.generation,
      version = session.match.version;
    stop();
    const controller = new AbortController();
    animation = controller;
    if (result.command.kind !== 'pass')
      playGameSound(result.command.kind === 'rotate' ? 'rotate' : 'place');
    if (!training) {
      frames.push({
        match: structuredClone(result.next),
        command: result.command,
        waves: result.waves,
        damage: result.damage,
      });
      if (result.next.winner !== null) {
        try {
          saveRemixReplay({
            id: crypto.randomUUID(),
            date: new Date().toLocaleString('ja-JP'),
            result:
              result.next.winner === 0 ? '引き分け' : playerName(result.next.winner) + 'の勝利',
            schemaVersion: 1,
            ruleVersion: result.next.ruleVersion,
            mode: live.mode,
            frames: structuredClone(frames),
          });
          records = readRemixReplays();
        } catch {
          notice = '対局は完了しましたが、履歴を保存できませんでした。';
        }
      }
    }
    const valid = () =>
      !controller.signal.aborted &&
      session.valid(generation, version) &&
      currentSession() === session &&
      !replay;
    render(before);
    await playRemixAttack(app, before, result, {
      current: valid,
      signal: controller.signal,
      reduced: motion || matchMedia('(prefers-reduced-motion: reduce)').matches,
      ms: duration === 'short' ? 450 : duration === 'long' ? 1400 : 900,
      onWave: (chain) => {
        if (valid()) playGameSound('chain', chain);
      },
      show: (visual, label) => {
        if (valid()) {
          attackStatus = label;
          render(visual);
        }
      },
    });
    if (!valid()) return;
    session.finish(generation, version);
    if (result.next.winner !== null) playGameSound('victory');
    animation = undefined;
    if (training) {
      training.success = true;
      notice = '練習成功！ 次の練習へ進めます。';
    }
    attackStatus =
      result.command.kind === 'pass'
        ? `${playerName(result.actor)}は置けるマスがないためパスしました`
        : `${result.waves.length}連鎖・${result.damage}ダメージ`;
    render();
  } catch (error) {
    session.busy = false;
    notice = (error as Error).message;
    render();
  }
}
function on(id: string, action: () => void) {
  app.querySelector('#' + id)?.addEventListener('click', action);
}
function runAi() {
  if (
    guide !== null ||
    turnNotice.active ||
    worker ||
    practice ||
    replay ||
    live.mode !== 'ai' ||
    live.match.turn === live.human ||
    live.match.winner !== null ||
    live.busy
  )
    return;
  const generation = live.generation,
    version = live.match.version;
  live.busy = true;
  worker = new Worker(new URL('./ai/remix-worker.ts', import.meta.url), { type: 'module' });
  const receive = (command: RemixCommand) => {
    if (!live.valid(generation, version) || practice || replay) return;
    worker?.terminate();
    worker = undefined;
    live.busy = false;
    const legal = available(live.match);
    const chosen =
      legal.find((candidate) => command && sameCommand(candidate, command)) ?? legal[0];
    if (chosen) {
      live.select(chosen);
      void confirm();
    }
  };
  worker.onmessage = (
    event: MessageEvent<{ generation: number; version: number; command: RemixCommand }>,
  ) => {
    if (event.data.generation === generation && event.data.version === version)
      receive(event.data.command);
  };
  worker.onerror = () => {
    notice = 'AI処理に失敗したため、合法な代替手を選びます。';
    receive(available(live.match)[0]);
  };
  worker.postMessage({
    match: live.match,
    ai: other(live.human),
    level,
    generation,
    version,
    seed: Date.now() >>> 0,
  });
}
function render(visual?: RemixMatch) {
  if (
    guide === null &&
    !visual &&
    !practice &&
    !replay &&
    !live.busy &&
    live.match.winner === null
  ) {
    const generation = live.generation,
      version = live.match.version;
    const passing = available(live.match)[0]?.kind === 'pass';
    const label = passing
      ? `${playerName(live.match.turn)}は置けるマスがないためパスします`
      : live.mode === 'ai'
        ? live.match.turn === live.human
          ? 'あなたの番です'
          : 'AIの番です'
        : `${playerName(live.match.turn)}の番です`;
    turnNotice.begin(`${generation}:${version}`, label, () => {
      if (!live.valid(generation, version) || practice || replay) return;
      if (passing) {
        live.select({ kind: 'pass' });
        void confirm();
      } else render();
    });
  }
  const open = new Set(
    [...app.querySelectorAll('details[open]')].map(
      (node) => node.querySelector('summary')?.textContent,
    ),
  );
  const session = currentSession(),
    actual = replay ? replay.frames[replayIndex].match : session.match,
    current = visual ?? actual;
  const commands = available(actual),
    rotateAllowed = commands.some((command) => command.kind === 'rotate');
  const aiTurn = !practice && live.mode === 'ai' && actual.turn !== live.human;
  const locked =
    guide !== null ||
    turnNotice.active ||
    !!replay ||
    session.busy ||
    actual.winner !== null ||
    aiTurn ||
    !!practice?.success;
  const preview = session.busy || replay ? null : session.selection;
  setMusicPlaying(!replay && (actual.winner === null || session.busy));
  document.documentElement.classList.toggle('guide-open', guide !== null);
  document.documentElement.classList.toggle(
    'reduced-motion',
    motion || matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  app.innerHTML = `<main class="shell"><p class="width-warning">横幅1280px以上の画面でプレイしてください。</p><header><div><h1>リミックス・オセロ</h1><p>盤面を回して、連続攻撃で相手のHPを0にする。</p><p>石を置くか、4×4区画を右・左に回すか。どちらか1つで勝負。</p></div><div class="status" aria-live="polite"><strong>${actual.winner !== null ? (actual.winner === 0 ? '引き分け' : playerName(actual.winner) + 'の勝利') : playerName(actual.turn) + 'の手番'}</strong><span>${actual.ply}手　${replay ? '履歴再生' : practice ? '練習モード' : live.mode === 'ai' ? 'あなた：シアン ／ AI：オレンジ' : '2人対戦'}</span><span>${actual.winner !== null ? '対局終了' : aiTurn ? 'AIが思考・攻撃中' : '自分の操作を選んでください'}</span></div></header>
 <nav class="mode-toolbar"><button id="local">2人対戦</button><button id="ai">AI対戦</button><button id="tutorial">練習モード</button><button id="guide">遊び方ガイド</button><button id="new">新しい対局</button><button id="rematch">先後を交代して再戦</button><label>難易度<select id="difficulty">${Object.entries(difficultySettings).map(([value, setting]) => `<option value="${value}" ${level === value ? 'selected' : ''}>${setting.label}</option>`).join('')}</select></label></nav>
 ${practice ? `<section class="tutorial-banner"><h2>${PRACTICE[practice.index].title}</h2><p>${PRACTICE[practice.index].text}</p><p id="practice-progress">${practice.success ? '練習成功' : '練習中'} ${practice.index + 1} / ${PRACTICE.length}</p><button id="retry">この練習をやり直す</button><button id="next" ${practice.success ? '' : 'disabled'}>${practice.index === PRACTICE.length - 1 ? '練習を完了' : '次の練習へ'}</button><button id="close-practice">元の対局に戻る</button></section>` : ''}
 ${hpMarkup(current)}<p role="status">${escape(notice)}</p><section class="game-layout"><div class="board-wrap">${boardMarkup(current, { locked, input, preview, quadrant: input === 'rotate' ? quadrant : null })}<p>白点：着手できる場所 ／ 太線：4つの区画 ／ 黄色の番号：反転する順番</p><p id="attack-status" aria-live="polite">${replay ? `${replay.frames[replayIndex].waves?.length ?? 0}連鎖・${replay.frames[replayIndex].damage ?? 0}ダメージ` : escape(attackStatus)}</p>
 ${replay ? `<section class="result-card"><p>リプレイ ${replayIndex}/${replay.frames.length - 1}手</p><button id="rprev" ${replayIndex === 0 ? 'disabled' : ''}>前の手</button><button id="rnext" ${replayIndex === replay.frames.length - 1 ? 'disabled' : ''}>次の手</button><button id="rclose">対局へ戻る</button><button id="restart">この開始条件の先後を交代して再戦</button></section>` : actual.winner !== null && !practice ? `<section class="result-card"><h2>対局結果</h2><p>${actual.endReason === 'hp' ? 'HPが0になったため終了' : actual.endReason === 'blocked' ? '双方とも置けるマスがないため、HP→石数で判定' : '攻撃なしが10手続いたため、HP→石数で判定'}</p><button id="same">先後を交代して再戦</button></section>` : ''}</div>
 <aside class="panel"><section class="panel-card"><h2>自分の番の操作</h2><div class="action-row"><button id="place-mode" aria-pressed="${input === 'cell'}" ${locked ? 'disabled' : ''}>石を置く</button><button id="rotate-mode" aria-pressed="${input === 'rotate'}" ${locked || !rotateAllowed ? 'disabled' : ''}>区画を回す</button></div><p id="rotation-rule">${rotateAllowed ? '回転できます。置けるマスがない番は自動でパスします。' : '前の自分の番に回したので、今回は石を置いてください。'}</p>
 ${input === 'rotate' ? `<p>回す区画を選ぶ</p><div class="action-row">${['左上', '右上', '左下', '右下'].map((label, index) => `<button data-quarter="${index}" aria-pressed="${quadrant === index}" ${locked ? 'disabled' : ''}>${label}</button>`).join('')}</div><div class="action-row"><button id="right" aria-pressed="${direction === 'right'}" ${locked ? 'disabled' : ''}>右回り ↻</button><button id="left" aria-pressed="${direction === 'left'}" ${locked ? 'disabled' : ''}>左回り ↺</button></div>` : '<p>白点のマスをクリックすると攻撃予告が出ます。</p>'}</section>
 <section class="panel-card preview-card"><h2>攻撃の予告</h2><p id="preview">${preview ? `${preview.waves.length}連鎖 ／ 合計 ${preview.damage}ダメージ<br>相手HP：${actual.hp[other(actual.turn)]} → ${preview.next.hp[other(actual.turn)]}` : '操作を選ぶと反転する石とダメージを表示します。'}</p><button id="confirm" ${locked || !preview ? 'disabled' : ''}>攻撃を決定</button><button id="cancel" ${locked || !preview ? 'disabled' : ''}>取り消す</button></section>
 <section class="panel-card"><h2>勝ち方</h2><p>反転1個で1ダメージ。連続攻撃で相手HPを0にすると勝ち。</p><p id="quiet">攻撃なし：${actual.quiet} / 10手</p><p>10手続いたら残りHP、同じなら石数で判定。双方とも置けない場合も、HP→石数で判定します。</p></section>
 <details><summary>演出設定</summary><label><input id="music" type="checkbox" ${music ? 'checked' : ''}>BGM</label><label class="audio-setting" for="music-volume">BGM音量<output id="music-volume-value">${Math.round(musicVolume * 100)}%</output><input id="music-volume" type="range" min="0" max="100" value="${Math.round(musicVolume * 100)}"></label><label><input id="sound" type="checkbox" ${sound ? 'checked' : ''}>効果音</label><label class="audio-setting" for="sound-volume">SE音量<output id="sound-volume-value">${Math.round(soundVolume * 100)}%</output><input id="sound-volume" type="range" min="0" max="100" value="${Math.round(soundVolume * 100)}"></label><p>音は最初のクリック・キー操作後に始まります。別のタブへ移ると一時停止します。</p><label><input id="motion" type="checkbox" ${motion ? 'checked' : ''}>演出軽減</label><select id="duration" aria-label="演出速度">${['short', 'standard', 'long'].map((value, index) => `<option value="${value}" ${duration === value ? 'selected' : ''}>${['短', '標準', '長'][index]}</option>`).join('')}</select></details>
 <details><summary>対局履歴・全手再生</summary><div id="history"></div></details></aside></section></main>`;
  if (turnNotice.active)
    app.insertAdjacentHTML(
      'beforeend',
      `<div id="turn-notice" class="turn-notice" aria-live="polite"><span>${escape(turnNotice.text)}</span></div>`,
    );
  if (guide !== null) {
    const step = GUIDE_STEPS[guide],
      last = guide === GUIDE_STEPS.length - 1;
    const target = step.target ? app.querySelector<HTMLElement>(step.target) : null;
    const focus = target?.closest<HTMLElement>('.panel-card') ?? target;
    focus?.classList.add('guide-focus');
    // 画面下部の説明ダイアログに隠れないよう、強調要素を中央へ寄せる。
    focus?.scrollIntoView({ block: 'center' });
    app.insertAdjacentHTML(
      'beforeend',
      `<div class="guide-backdrop"></div><section id="guide-dialog" class="guide-dialog" role="dialog" aria-modal="true" aria-labelledby="guide-title"><p class="guide-progress">遊び方ガイド ${guide + 1} / ${GUIDE_STEPS.length}</p><h2 id="guide-title">${step.title}</h2><p>${step.text}</p><div class="guide-actions"><button id="guide-skip">スキップ</button><span></span><button id="guide-prev" ${guide === 0 ? 'disabled' : ''}>戻る</button>${last ? '<button id="guide-practice" class="guide-primary">練習モードを始める</button><button id="guide-play">対局を始める</button>' : '<button id="guide-next" class="guide-primary">次へ</button>'}</div></section>`,
    );
    const dialog = app.querySelector<HTMLElement>('#guide-dialog')!;
    dialog.querySelector<HTMLButtonElement>('.guide-primary')?.focus();
    dialog.onkeydown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeGuide();
        render();
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        guide = moveGuideStep(guide ?? 0, event.key === 'ArrowRight' ? 1 : -1);
        render();
      }
    };
  }
  const choose = (command: RemixCommand) => {
    if (!locked) select(command);
  };
  app.querySelectorAll<HTMLButtonElement>('[data-index]').forEach((cell) => {
    cell.onclick = () => {
      if (locked) return;
      const index = Number(cell.dataset.index);
      if (input === 'rotate') {
        quadrant = quadrantOf(index);
        choose({ kind: 'rotate', quadrant, direction });
      } else choose({ kind: 'cell', index });
    };
    cell.onkeydown = (event) => {
      const index = Number(cell.dataset.index),
        row = Math.floor(index / 8),
        col = index % 8;
      const target =
        event.key === 'ArrowRight' && col < 7
          ? index + 1
          : event.key === 'ArrowLeft' && col > 0
            ? index - 1
            : event.key === 'ArrowDown' && row < 7
              ? index + 8
              : event.key === 'ArrowUp' && row > 0
                ? index - 8
                : index;
      if (event.key.startsWith('Arrow')) {
        event.preventDefault();
        app.querySelector<HTMLButtonElement>(`[data-index="${target}"]`)?.focus();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        session.cancel();
        if (practice) practice.cancelled = true;
        render();
      }
    };
  });
  on('place-mode', () => {
    input = 'cell';
    quadrant = null;
    session.cancel();
    render();
  });
  on('rotate-mode', () => {
    input = 'rotate';
    quadrant = null;
    session.cancel();
    render();
  });
  app.querySelectorAll<HTMLButtonElement>('[data-quarter]').forEach((button) => {
    button.onclick = () => {
      quadrant = Number(button.dataset.quarter) as Quadrant;
      choose({ kind: 'rotate', quadrant, direction });
    };
  });
  for (const value of ['right', 'left'] as const)
    on(value, () => {
      direction = value;
      if (quadrant !== null) choose({ kind: 'rotate', quadrant, direction });
      else render();
    });
  on('confirm', () => {
    void confirm();
  });
  on('cancel', () => {
    session.cancel();
    if (practice) practice.cancelled = true;
    render();
  });
  on('local', () => start('local'));
  on('ai', () => start('ai'));
  on('new', () => start());
  on('rematch', () => start(live.mode, true));
  on('same', () => start(live.mode, true));
  on('tutorial', () => lesson(0));
  on('guide', () => {
    interrupt();
    guide = 0;
    render();
  });
  on('guide-next', () => {
    guide = moveGuideStep(guide ?? 0, 1);
    render();
  });
  on('guide-prev', () => {
    guide = moveGuideStep(guide ?? 0, -1);
    render();
  });
  for (const id of ['guide-skip', 'guide-play'])
    on(id, () => {
      closeGuide();
      render();
    });
  on('guide-practice', () => {
    closeGuide();
    lesson(0);
  });
  on('retry', () => {
    if (practice) lesson(practice.index);
  });
  on('next', () => {
    if (!practice?.success) return;
    if (practice.index === PRACTICE.length - 1) {
      interrupt();
      practice = null;
      input = 'cell';
      quadrant = null;
      notice = '練習完了。元の対局に戻りました。';
      render();
    } else lesson(practice.index + 1);
  });
  on('close-practice', () => {
    interrupt();
    practice = null;
    input = 'cell';
    quadrant = null;
    notice = '元の対局に戻りました';
    render();
  });
  app.querySelector<HTMLSelectElement>('#difficulty')?.addEventListener('change', (event) => {
    level = (event.target as HTMLSelectElement).value as AiLevel;
    interrupt();
    render();
  });
  for (const id of ['sound', 'music', 'music-volume', 'sound-volume', 'motion', 'duration'])
    app
      .querySelector('#' + id)
      ?.addEventListener(id.endsWith('volume') ? 'input' : 'change', (event) => {
        const target = event.target as HTMLInputElement;
        if (id === 'sound') sound = target.checked;
        else if (id === 'music') music = target.checked;
        else if (id === 'music-volume') musicVolume = Number(target.value) / 100;
        else if (id === 'sound-volume') soundVolume = Number(target.value) / 100;
        else if (id === 'motion') motion = target.checked;
        else duration = target.value;
        saveSettings();
        if (id !== 'motion' && id !== 'duration') {
          const output = app.querySelector('#' + id + '-value');
          if (output) output.textContent = target.value + '%';
          void unlockAudio();
          return;
        }
        interrupt();
        render();
      });
  records.forEach((record) => {
    const button = document.createElement('button');
    button.textContent = record.date + ' ' + record.result;
    button.onclick = () => {
      interrupt();
      practice = null;
      replay = record;
      replayIndex = 0;
      input = 'cell';
      quadrant = null;
      notice = '';
      render();
    };
    app.querySelector('#history')?.append(button);
  });
  on('rprev', () => {
    replayIndex = Math.max(0, replayIndex - 1);
    render();
  });
  on('rnext', () => {
    if (replay) replayIndex = Math.min(replay.frames.length - 1, replayIndex + 1);
    render();
  });
  on('rclose', () => {
    interrupt();
    replay = null;
    notice = '元の対局に戻りました';
    render();
  });
  on('restart', () => {
    if (replay) start(replay.mode, true, replay.frames[0].match.firstPlayer);
  });
  app.querySelectorAll('details').forEach((details) => {
    details.open = open.has(details.querySelector('summary')?.textContent);
  });
  if (!visual) runAi();
}
saveSettings();
document.addEventListener(
  'pointerdown',
  () => {
    void unlockAudio();
  },
  { capture: true },
);
document.addEventListener(
  'keydown',
  () => {
    void unlockAudio();
  },
  { capture: true },
);
document.addEventListener('visibilitychange', () => {
  void setAudioHidden(document.hidden);
});
window.addEventListener('pagehide', () => {
  void setAudioHidden(true);
});
window.addEventListener('pageshow', () => {
  void setAudioHidden(document.hidden);
});
render();
