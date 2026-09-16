import { animateFlips } from './presentation/stone-animation';
import './presentation/styles.css';
import './presentation/rpg.css';
import {
  createMatch,
  transition,
  available,
  party,
  type Match,
  type Command,
} from './domain/match';
import { HEROES } from './domain/heroes';
import { STAGES } from './domain/campaign';
import { scores } from './domain/rules';
import type { AiLevel } from './ai/search';
import { readReplays, writeReplay, type Replay } from './infrastructure/replays';
import { playMoveSound } from './infrastructure/audio';
import { LESSONS } from './presentation/tutorial';

const app = document.querySelector<HTMLDivElement>('#app')!;
let match = createMatch(Date.now() >>> 0),
  frames: Match[] = [structuredClone(match)];
let mode: 'local' | 'ai' = 'local',
  level: AiLevel = 'standard',
  worker: Worker | undefined,
  epoch = 0;
let replay: Replay<Match> | null = null,
  replayIndex = 0,
  lesson = -1,
  notice = '';
let animating=false;
let sound = true,
  motion = false,
  duration = 'standard';
try {
  const settings = JSON.parse(localStorage.getItem('jiso.settings') ?? '{}');
  sound = settings.sound ?? true;
  motion = settings.motion ?? false;
  duration = settings.duration ?? 'standard';
} catch {
  notice = '設定を初期化しました';
}
const name = (p: number) => (p === 1 ? 'シアン' : 'オレンジ');
const coord = (i: number) => String.fromCharCode(65 + (i % 8)) + (Math.floor(i / 8) + 1);
const rule = (m: Match) =>
  m.victory === 'base'
    ? '相手の2拠点を陥落'
    : m.victory === 'score'
      ? '通常着手終了時の石数'
      : '自分のクエスト3件を達成';
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
function stop() {
  epoch++;
  worker?.terminate();
  worker = undefined;
}
function start(seed = Date.now() >>> 0, stage = match.stage, heroes = match.heroes, swap = false) {
  stop();
  match = createMatch(seed, stage, [...heroes]);
  if (swap) {
    match.turn = match.turn === 1 ? 2 : 1;
    match.heroes = [heroes[1], heroes[0]];
  }
  frames = [structuredClone(match)];
  replay = null;
  lesson = -1;
  notice = '';
  render();
}
function settings() {
  try {
    localStorage.setItem('jiso.settings', JSON.stringify({ sound, motion, duration }));
    localStorage.setItem('jiso-reversi.sound', sound ? 'on' : 'off');
  } catch {
    notice = '設定を保存できません';
  }
}
function effect(text: string) {
  const node = document.createElement('div');
  node.className = 'rpg-effect gold';
  node.textContent = text;
  const ms =
    motion || matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 150
      : duration === 'short'
        ? 400
        : duration === 'long'
          ? 1400
          : 800;
  node.style.animationDuration = ms + 'ms';
  document.body.append(node);
  setTimeout(() => node.remove(), ms);
}
async function commit(command: Command) {
  if (replay || lesson >= 0 || animating) return;
  try {
    const before=[...match.board];
    match = transition(match, command);
    animating=true;
    frames.push(structuredClone(match));
    if (sound) playMoveSound();
    effect(match.log.join('・'));
    if (match.winner !== null) {
      try {
        writeReplay({
          id: crypto.randomUUID(),
          date: new Date().toLocaleString('ja-JP'),
          result: match.winner === 0 ? '引き分け' : name(match.winner) + 'の勝利',
          snapshots: frames,
        });
      } catch {
        notice = '対局は完了しましたが履歴を保存できませんでした';
      }
    }
    render();
    if(!motion&&!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      await animateFlips(app,before,match.board,duration==='short'?250:duration==='long'?800:450);
    }
    animating=false;
    render();
  } catch (error) {
    animating=false;
    notice = (error as Error).message;
    render();
  }
}
function button(id: string, fn: () => void) {
  app.querySelector('#' + id)?.addEventListener('click', fn);
}
function render() {
  const openSections = new Set(
    [...app.querySelectorAll('details[open]')].map((d) => d.querySelector('summary')?.textContent),
  );
  stop();
  document.documentElement.classList.toggle(
    'reduced-motion',
    motion || matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  if (lesson >= 0) {
    app.innerHTML = `<main class="shell"><h1>遊び方</h1><section class="panel-card tutorial"><p>ステップ ${lesson + 1} / 5</p><h2>${LESSONS[lesson][0]}</h2><p>${LESSONS[lesson][1]}</p><img class="companions" src="/assets/companions.svg" alt="英雄キャラクター"><button id="prev" ${lesson === 0 ? 'disabled' : ''}>前へ</button><button id="next">${lesson === 4 ? '完了' : '次へ'}</button><button id="close">対局へ戻る</button></section></main>`;
    button('prev', () => {
      lesson--;
      render();
    });
    button('next', () => {
      lesson = lesson === 4 ? -1 : lesson + 1;
      render();
    });
    button('close', () => {
      lesson = -1;
      render();
    });
    return;
  }
  const m = replay ? replay.snapshots[replayIndex] : match,
    commands = available(m),
    legal = new Set(
      commands.filter((c) => c.kind === 'cell').map((c) => (c as { index: number }).index),
    );
  const allies = new Set([...party(m, 1), ...party(m, 2)]),
    tally = scores(m.board),
    locked = animating || !!replay || m.winner !== null || (mode === 'ai' && m.turn === 2);
  const terrain = STAGES[m.stage].terrain;
  app.innerHTML = `<main class="shell"><p class="width-warning">横幅1280px以上の画面でプレイしてください。</p><header><div><h1>時層リバーシ RPG</h1><p>目的：${rule(m)}</p><p>120手では拠点数 → クエスト達成数 → 石数で判定</p></div><div class="status" aria-live="polite"><strong>${m.winner !== null ? (m.winner === 0 ? '引き分け' : name(m.winner) + 'の勝利') : name(m.turn) + 'の手番'}</strong><span>${m.ply}/120手　石数 ${tally[0]} 対 ${tally[1]}</span></div></header>
  <nav class="mode-toolbar"><button id="local">2人対戦</button><button id="ai">AI対戦</button><button id="tutorial">遊び方</button><button id="new">新しい対局</button><label>難易度<select id="difficulty">${['beginner', 'standard', 'advanced'].map((l, i) => `<option value="${l}" ${level === l ? 'selected' : ''}>${['初級', '標準', '上級'][i]}</option>`).join('')}</select></label></nav>
  <p role="status">${escape(notice)}</p>
  <section class="game-layout"><div class="board-wrap">
  <div class="board" role="group" aria-label="RPG盤面">${m.board
    .map((cell, i) => {
      const base = m.rpg.heroes.find((h) => h.index === i),
        land = terrain.find((t) => t.index === i);
      return `<button class="cell ${cell === 1 ? 'stone-cyan' : cell === 2 ? 'stone-orange' : ''} ${base ? 'hero-' + (base.owner === 1 ? 'cyan' : 'orange') : ''} ${allies.has(i) ? 'party-member' : ''} ${land ? 'terrain-' + land.type : ''}" data-index="${i}" aria-label="${coord(i)} ${base ? name(base.owner) + '拠点 ' + (base.defeated ? '陥落' : base.shield ? '防御あり' : '防御なし') : cell ? name(cell) + '石' : (land?.label ?? '空き')} ${legal.has(i) ? '行動可能' : ''}" aria-disabled="${locked || !legal.has(i)}"><span class="coord">${coord(i)}</span>${base ? `<span class="portrait ${base.owner === 2 ? 'orange-portrait' : ''}" role="img" aria-label="英雄"></span><span class="base-state">${base.defeated ? '陥落' : base.shield ? '防御' : '攻撃可'}</span>` : cell ? '<span class="stone"></span>' : legal.has(i) ? '<span class="legal-dot"></span>' : ''}${land ? `<span class="terrain-mark">${land.label}</span>` : ''}</button>`;
    })
    .join('')}</div><p>白点：着手　緑枠：仲間　四隅：英雄拠点</p>
  ${replay ? `<section class="result-card"><p>リプレイ ${replayIndex}/${replay.snapshots.length - 1}手</p><button id="rprev">前の手</button><button id="rnext">次の手</button><button id="rclose">対局に戻る</button><button id="restart">この開始条件で再戦</button></section>` : m.winner !== null ? `<section class="result-card"><h2>対局結果</h2><p>${m.winner === 0 ? '引き分け' : name(m.winner) + 'の勝利'}</p><p>${m.log.map(escape).join('・')}</p><button id="same">同じ条件で再戦</button><button id="swap">先手・英雄を交換して再戦</button></section>` : ''}
  </div><aside class="panel"><section class="panel-card"><h2>可能な行動</h2><p>白点に着手、または相手の拠点をクリック。どの行動も1手を使います。</p><button id="skill" ${locked || !commands.some((c) => c.kind === 'skill') ? 'disabled' : ''}>固有スキル：${HEROES[m.heroes[m.turn - 1]].name}</button><p>${HEROES[m.heroes[m.turn - 1]].skill}</p><button id="pass" ${locked || !commands.some((c) => c.kind === 'pass') ? 'disabled' : ''}>通常パス</button></section>
  ${([1, 2] as const).map((p) => `<section class="panel-card"><h2>${name(p)}　Lv.${m.rpg.level[p]}</h2><p>経験値 ${m.rpg.experience[p]}　仲間 ${party(m, p).length}　拠点 ${m.rpg.heroes.filter((h) => h.owner === p && !h.defeated).length}/2</p><ul>${m.quests[p].map((q) => `<li>${q.text} ${q.progress}/${q.goal} ${q.progress >= q.goal ? '達成' : ''}</li>`).join('')}</ul></section>`).join('')}
  <details><summary>開始設定</summary><label>ステージ<select id="stage" ${m.ply || replay ? 'disabled' : ''}>${STAGES.map((s, i) => `<option value="${i}" ${m.stage === i ? 'selected' : ''}>${s.name}</option>`).join('')}</select></label>${([0, 1] as const).map((p) => `<label>${name(p + 1)}英雄<select id="hero${p}" ${m.ply || replay ? 'disabled' : ''}>${HEROES.map((h, i) => `<option value="${i}" ${m.heroes[p] === i ? 'selected' : ''}>${h.name}</option>`).join('')}</select></label>`).join('')}</details>
  <details><summary>演出設定</summary><label><input id="sound" type="checkbox" ${sound ? 'checked' : ''}>効果音</label><label><input id="motion" type="checkbox" ${motion ? 'checked' : ''}>演出軽減</label><select id="duration"><option value="short" ${duration === 'short' ? 'selected' : ''}>短</option><option value="standard" ${duration === 'standard' ? 'selected' : ''}>標準</option><option value="long" ${duration === 'long' ? 'selected' : ''}>長</option></select></details>
  <details><summary>対局履歴・全手再生</summary><div id="history"></div></details><p aria-live="polite">${m.log.map(escape).join('・')}</p></aside></section></main>`;
  app.querySelectorAll<HTMLButtonElement>('[data-index]').forEach((b) => {
    b.onclick = () => {
      if (!locked) commit({ kind: 'cell', index: Number(b.dataset.index) });
    };
    b.onkeydown = (e) => {
      const i = Number(b.dataset.index),
        r = Math.floor(i / 8),
        c = i % 8;
      const target =
        e.key === 'ArrowRight' && c < 7
          ? i + 1
          : e.key === 'ArrowLeft' && c > 0
            ? i - 1
            : e.key === 'ArrowDown' && r < 7
              ? i + 8
              : e.key === 'ArrowUp' && r > 0
                ? i - 8
                : i;
      if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        app.querySelector<HTMLButtonElement>('[data-index="' + target + '"]')?.focus();
      }
    };
  });
  button('local', () => {
    mode = 'local';
    start();
  });
  button('ai', () => {
    mode = 'ai';
    start();
  });
  button('new', () => start());
  button('tutorial', () => {
    lesson = 0;
    render();
  });
  button('skill', () => commit({ kind: 'skill' }));
  button('pass', () => commit({ kind: 'pass' }));
  button('same', () => {
    match = structuredClone(frames[0]);
    frames = [structuredClone(match)];
    render();
  });
  button('swap', () => start(match.seed, match.stage, match.heroes, true));
  const select = (id: string, fn: (value: string) => void) =>
    app
      .querySelector<HTMLSelectElement>('#' + id)
      ?.addEventListener('change', (e) => fn((e.target as HTMLSelectElement).value));
  select('difficulty', (v) => {
    level = v as AiLevel;
    render();
  });
  select('stage', (v) => start(match.seed, Number(v)));
  for (const p of [0, 1] as const)
    select('hero' + p, (v) => {
      match.heroes[p] = Number(v);
      frames = [structuredClone(match)];
      render();
    });
  for (const id of ['sound', 'motion'])
    app.querySelector<HTMLInputElement>('#' + id)?.addEventListener('change', (e) => {
      if (id === 'sound') sound = (e.target as HTMLInputElement).checked;
      else motion = (e.target as HTMLInputElement).checked;
      settings();
      render();
    });
  select('duration', (v) => {
    duration = v;
    settings();
    render();
  });
  readReplays<Match>().forEach((record) => {
    const b = document.createElement('button');
    b.textContent = record.date + ' ' + record.result;
    b.onclick = () => {
      replay = record;
      replayIndex = 0;
      render();
    };
    app.querySelector('#history')?.append(b);
  });
  button('rprev', () => {
    replayIndex = Math.max(0, replayIndex - 1);
    render();
  });
  button('rnext', () => {
    replayIndex = Math.min(replay!.snapshots.length - 1, replayIndex + 1);
    render();
  });
  button('rclose', () => {
    replay = null;
    render();
  });
  button('restart', () => {
    match = structuredClone(replay!.snapshots[0]);
    frames = [structuredClone(match)];
    replay = null;
    render();
  });
  app.querySelectorAll('details').forEach((d) => {
    d.open = openSections.has(d.querySelector('summary')?.textContent);
  });
  if (!animating && !replay && mode === 'ai' && match.turn === 2 && match.winner === null) {
    const token = epoch;
    worker = new Worker(new URL('./ai/rpg-worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<Command>) => {
      if (token === epoch) commit(e.data);
    };
    worker.onerror = () => {
      if (token === epoch) {
        notice = 'AI処理に失敗したため合法な代替手を使います';
        commit(available(match)[0]);
      }
    };
    worker.postMessage({ match, level });
  }
}
render();
