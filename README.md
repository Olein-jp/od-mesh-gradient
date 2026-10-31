# OD Mesh Gradient

WordPress プラグインの最小開発基盤です。メッシュグラデーションの機能はこれから実装します。

## 必要な環境

- WordPress 5.9 以上、PHP 7.4 以上（更新ライブラリの要件に合わせています）
- Node.js 20.19 以上（新規環境では Node.js 22 推奨）、npm、Docker
- ホストで配布 ZIP を作る場合は PHP、Composer 2、Python 3

wp-env は Docker 開発に必要な構成を備え、既存の Node.js 20 環境でも使える 10.36.0 に固定しています。

## 開発

```sh
npm ci
npm run env:start
npm run composer -- install
npm run lint:php
```

起動時に表示される URL から WordPress を開けます。ほかの環境とポートが重複する場合は、Git 管理対象外の `.wp-env.override.json` で変更してください。この作業環境では開発用に 8894、テスト用に 8895 を設定しています。wp-env の初期認証情報は `admin` / `password` です。

```sh
npm run env:cli -- plugin activate od-mesh-gradient
npm run env:logs
npm run env:stop
```

Composer は wp-env の cli コンテナ内、`wp-content/plugins/od-mesh-gradient` で実行します。
ホストに PHP と Composer がある場合は `composer install` / `composer lint` でも開発できます。
PHP の追加先は `phpcs.xml.dist` の検査対象にも追加してください。

## 多言語化

表示する文章は英語を原文にして `__()`、`esc_html__()`、`esc_html_e()` などで囲み、テキストドメイン `od-mesh-gradient` を指定します。
翻訳は `init` で読み込みます。

```sh
npm run i18n:pot
# POT を翻訳ツールで開き languages/od-mesh-gradient-ja.po などを作成・更新
npm run i18n:mo
```

`.po` と生成した `.mo` を `languages/` に保存してコミットしてください。配布 ZIP にも含まれます。
PHP と WordPress が必要な POT / MO 生成は wp-env 内の WP-CLI を使います。

## リリースと WordPress からの更新

[wp-github-plugin-updater](https://github.com/inc2734/wp-github-plugin-updater) を Composer で導入しています。
公開リポジトリ `Olein-jp/od-mesh-gradient` の最新の正式 GitHub Release を確認し、添付 ZIP から WordPress の通常の更新機能で更新します。

バージョンは **`0.1.0` のようなタグ**で管理します。`v` は付けません。
ソースの `Version` と `Stable tag` は開発用の `0.0.0` のままで構いません。配布時にタグから両方を自動設定します。

変更をコミットして GitHub へ送った後、例えば次の操作で公開します。

```sh
git tag 0.1.0
git push origin 0.1.0
```

GitHub Actions がコーディング規約を確認し、実行用の依存パッケージだけを含む `od-mesh-gradient.zip` を作り、同名の GitHub Release に添付します。
標準の `GITHUB_TOKEN` を使うので追加のシークレット設定は不要です。リポジトリ側で Actions の実行が許可されている必要があります。
既に公開したタグは変更せず、次回は番号を上げてください。

初回は Releases の **`od-mesh-gradient.zip`** を WordPress 管理画面からアップロードしてください。
GitHub が自動生成する Source code ZIP には依存パッケージが含まれません。
以降は新しい Release の公開後に管理画面の更新確認を行います。ライブラリによる確認結果のキャッシュがあります。
WordPress の「自動更新」を有効にすると WordPress 側のスケジュールで適用されます。

配布物だけを手元で確認する場合:

```sh
python3 scripts/build-release.py 0.1.0
```

`dist/od-mesh-gradient.zip` が生成されます。GitHub への公開は行いません。
配布対象は `scripts/build-release.py` で明示しています。今後 `includes/` や `assets/` を追加した場合は配布対象にも追加してください。
開発ツール、ローカル設定、`node_modules` は配布しません。

## ライセンス

GPL-2.0-or-later
