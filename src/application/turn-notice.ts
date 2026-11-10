/** 世代変更時に取消可能な、手番表示専用の待機。AIや盤面入力とは分離する。 */
export class TurnNotice {
  text = '';
  private timer?: ReturnType<typeof setTimeout>;
  private key = '';
  private done?: () => void;
  get active() {
    return this.timer !== undefined;
  }
  begin(key: string, text: string, done: () => void) {
    if (key === this.key) return false;
    this.cancel();
    this.key = key;
    this.text = text;
    this.done = done;
    this.timer = setTimeout(() => this.finish(), 2000);
    return true;
  }
  /** 利用者の操作で案内を閉じ、待たずに手番を始める。表示中でなければ何もしない。 */
  skip() {
    if (this.timer === undefined) return false;
    clearTimeout(this.timer);
    this.finish();
    return true;
  }
  private finish() {
    const done = this.done;
    this.timer = undefined;
    this.done = undefined;
    this.text = '';
    done?.();
  }
  cancel() {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
    this.done = undefined;
    this.text = '';
    this.key = '';
  }
}
