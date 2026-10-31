# OD Mesh Gradient

WordPress 標準ブロックのスタイル設定に、CSS の radial-gradient を重ねたメッシュ風グラデーションの編集機能を追加します。独自ブロックは追加しません。

## 必要な環境

- WordPress 7.1 以上／PHP 8.2 以上
- 開発時: Node.js 24.18 以上、npm 11.16 以上、Docker、Composer 2、Python 3
- 検証環境: WordPress 7.1.4／PHP 8.2

## インストールと使用方法

1. `dist/od-mesh-gradient.zip` を WordPress の「プラグインを追加」からアップロードして有効化します。
2. グループなどの対応ブロックを選択し、サイドバーの「スタイル」を開きます。
3. 「メッシュグラデーション」を開き、「メッシュグラデーションを使用」を有効にします。
4. プリセット、ベースカラー、ポイントの色・位置・広がり・透明度を調整します。
5. 投稿を保存します。公開画面では JavaScript を追加せず PHP が背景を適用します。

ポイントは 2〜8 個です。プレビューでドラッグ、またはポイントにフォーカスして矢印キーで移動できます。Shift＋矢印キーは 10% 移動します。座標スライダーでも全ての位置を指定できます。

プリセットは Soft Pastel、Ocean Breeze、Sunset Glow、Midnight Aurora、Neutral Mist の 5 種類です。選択すると現在のメッシュ設定を置き換え、選択中のプリセット名を表示します。手動で変更すると「カスタム」と表示します。保存・再読み込み後も設定から名前を復元し、WordPress の Undo／Redo にも追従します。

メッシュは既存の背景設定より優先します。元の背景値は保持するので、無効化・設定リセット・プラグイン停止で元の背景に戻ります。既存ブロックの保存 HTML は変更しません。

## 対応方針

`supports.color.gradients === true` または `supports.background.gradient === true` を宣言したサーバー登録済みブロックを自動検出します。安全に背景を描画できる既知の構造だけに適用します。未知のブロックはパネルに案内を表示し、有効化を停止します。

MVP の標準アダプター: グループ、カラム、カラム内、段落、見出し、引用、プルクオート、詩、投稿コンテンツ。検証範囲は [テスト結果](docs/test-results.md) を参照してください。

サードパーティー製ブロックはフィルターと描画アダプターで追加できます。[技術仕様と使用例](docs/development.md) を参照してください。

## 開発とテスト

```sh
npm ci
composer install
npm run build
npm run env:start
npm run test:js
npm run test:php
npm run test:e2e
composer lint
```

標準ポートは 8888、テストは 8889 です。この作業環境は `.wp-env.override.json` で 8894／8895 を使用しています。ブラウザテストの既定 URL は `http://localhost:8894` です。他の環境では `WP_BASE_URL` で指定してください。wp-env 初期ユーザーは `admin`／`password` です。

wp-env はテスト用ブロックプラグイン `tests/fixtures` も有効化します。配布 ZIP には含めません。PHP 統合テストは WordPress を読み込んだ WP-CLI で動作します。

```sh
npm run start
npm run env:stop
python3 scripts/build-release.py 0.1.0
```

配布前に `npm run build` を実行してください。ZIP に `build/` と本番用 Composer 依存を含むため、利用者の環境に Node.js は不要です。

## 更新と翻訳

既存の `wp-github-plugin-updater` を維持しています。GitHub の正式 Release に添付した ZIP から WordPress の更新機能で更新できます。タグは `0.1.0` の形式です。タグの push は GitHub Actions による公開を伴います。

```sh
npm run i18n:pot
npm run i18n:mo
```

表示文には `od-mesh-gradient` のテキストドメインを指定しています。MVP の編集 UI 原文は日本語です。

## 制限事項と今後の改善

- 画像との合成、アニメーション、画像出力、ユーザープリセットの永続保存は対象外です。
- 独自の背景要素を持つボタンやカバーなどは自動適用しません。対応候補と描画対応は別々に判定します。
- テーマの `!important`、背景の疑似要素、独自の背景処理との一致は保証しません。
- 数学的なメッシュ補間ではありません。配列の先頭ポイントほど手前に表示します。
- 同期パターン、サイトエディター、テンプレートパーツ、タッチ端末、全ブラウザの確認は今後の課題です。
- ポイントのドラッグ中は属性を更新するので、Undo のまとまり方は WordPress の履歴処理に従います。

詳細な未検証項目と改善候補は [テスト結果](docs/test-results.md) に記載しています。

## ライセンス

GPL-2.0-or-later。Author: Koji Kuno / https://olein-design.com
