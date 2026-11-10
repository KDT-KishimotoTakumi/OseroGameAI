# 素材台帳

最終更新: 2026-09-20
状態: 背景写真1点（Unsplash License）とフォント2書体（SIL OFL 1.1）を外部から取得。音声・駒・演出はプロジェクト用に作成。

## 現行版の音楽・SE・反転エフェクト

- AUD-001：近未来風の110 BPM・4小節ループ。低音・和音・アルペジオを `src/infrastructure/synth-audio.ts` の音符列とWeb Audioで合成。2026-09-20採用。
- AUD-002：着手・区画回転・連鎖・勝利の4種SE。同ファイルで合成し、連鎖ごとに音高を上げる。2026-09-20採用。
- VFX-001：反転時の光輪と粒子。`src/presentation/flip-effects.ts` とCSSで生成。追加画像は使用しない。
- VFX-002：サイバー・アーケード風の画面装飾と追加演出（衝撃波・閃光・COMBO表示・揺れ・勝利演出）。`src/presentation/arcade.css` と `src/presentation/impact-effects.ts` のCSS・図形で生成。外部画像・フォントは使用しない。2026-11-10採用。
- IMG-003：背景 `public/assets/bg-neon-streaks.jpg`。「青と紫のネオンライトが暗い背景に縞模様を描きます」撮影 Logan Voss（https://unsplash.com/photos/EoZ0w5YLs7U ）。2026-11-10にChromeで個別ページの「Unsplashライセンスの下、無料で利用可能」表示を確認し、幅1600px・品質55で取得（626KB）。[Unsplash License](https://unsplash.com/license) により商用・非商用で無料利用・改変可、帰属表示は任意。写真単体の再販売・類似サービスへの転用は不可。画面上では暗い重ねと格子で減光して使用。
- PIECE-001：駒 `public/assets/piece-cyan.svg` / `piece-orange.svg`。プロジェクト用に作成したエネルギーコア型SVG。外部素材なし。2026-11-10採用。
- FONT-001：Dela Gothic One（大見出し・手番案内・勝敗表示・プレイヤー名）。npm `@fontsource/dela-gothic-one@5.3.0`、SIL Open Font License 1.1（原文は同パッケージの LICENSE）。
- FONT-002：Orbitron 700/900（HP数値・VS・CHAIN表示・座標）。npm `@fontsource/orbitron@5.3.0`、SIL Open Font License 1.1。
- 出典・利用条件：本プロジェクトのために作成したコード・音符列・図形。第三者の楽曲、録音、サンプルを取り込んでおらず、外部音源への帰属表示や音源ライセンスの追加条件はない。
