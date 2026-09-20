/** 世代変更時に取消可能な、手番表示専用の待機。AIや盤面入力とは分離する。 */
export class TurnNotice {
  text = '';
  private timer?: ReturnType<typeof setTimeout>;
  private key = '';
  get active() {
    return this.timer !== undefined;
  }
  begin(key: string, text: string, done: () => void) {
    if (key === this.key) return false;
    this.cancel();
    this.key = key;
    this.text = text;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.text = '';
      done();
    }, 2000);
    return true;
  }
  cancel() {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
    this.text = '';
    this.key = '';
  }
}
