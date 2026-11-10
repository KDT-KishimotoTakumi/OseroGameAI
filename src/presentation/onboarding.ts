export interface GuideStep {
  title: string;
  text: string;
  /** 強調する画面要素のセレクタ。操作パネル内の要素はパネルごと強調する。 */
  target?: string;
}

export const ONBOARDING_KEY = 'jiso.onboarding.v1';

type GuideStorage = Pick<Storage, 'getItem' | 'setItem'>;

export const GUIDE_STEPS: readonly GuideStep[] = [
  {
    title: 'ようこそ！ 目的はHPを0にすること',
    text: 'シアンとオレンジは両者HP50でスタート。相手の石を1個ひっくり返すごとに1ダメージ。先に相手のHPを0にした方の勝ちです。',
    target: '.hp-bars',
  },
  {
    title: '盤面は4つの区画',
    text: '太線で分かれた4×4の区画が4つあります。白点のマスは、今の手番で石を置ける場所です。',
    target: '.board',
  },
  {
    title: '自分の番にできることは1つ',
    text: '「石を置く」か「区画を回す」のどちらか1つを選びます。回す場合は区画（左上・右上・左下・右下）と、右回り／左回りを選びます。',
    target: '#place-mode',
  },
  {
    title: '予告を見てから「攻撃を決定」',
    text: 'マスや区画を選ぶと、反転する石に黄色の番号、右側に合計ダメージが出ます。よければ「攻撃を決定」、選び直すなら「取り消す」。',
    target: '#confirm',
  },
  {
    title: '連続攻撃と回転のルール',
    text: 'ひっくり返した石からさらに挟めると、連続で反転してダメージが増えます。回した次の自分の番は石を置きます。置けるマスがない番は自動でパスします。',
    target: '#rotation-rule',
  },
  {
    title: '決着がつかないとき',
    text: 'ダメージのない手が10手続くか、双方とも置けなくなったら、残りHP→石数の順で勝敗を判定します。',
    target: '#quiet',
  },
  {
    title: '準備完了！',
    text: 'まずは練習モードの5つの課題で操作を体験するのがおすすめです。このガイドは上の「遊び方ガイド」からいつでも見直せます。',
  },
];

export function shouldShowGuide(storage: Pick<GuideStorage, 'getItem'> | null): boolean {
  try {
    return storage?.getItem(ONBOARDING_KEY) !== 'done';
  } catch {
    // 保存領域を読めない環境でも、初めての人が遊び方を見られるよう表示を優先する。
    return true;
  }
}

export function markGuideSeen(storage: Pick<GuideStorage, 'setItem'> | null): boolean {
  if (!storage) return false;
  try {
    storage.setItem(ONBOARDING_KEY, 'done');
    return true;
  } catch {
    return false;
  }
}

export function moveGuideStep(index: number, delta: -1 | 1): number {
  return Math.max(0, Math.min(GUIDE_STEPS.length - 1, index + delta));
}
