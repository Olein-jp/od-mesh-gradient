=== OD Mesh Gradient ===
Contributors: olein
Tags: gradient, block-editor, design
Requires at least: 7.1
Tested up to: 7.1
Requires PHP: 8.2
Stable tag: 0.1.2
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

対応ブロックにメッシュ風グラデーションの編集 GUI を追加します。

== Description ==
色・位置・広がり・透明度を持つ 2〜8 個のポイントとベースカラーを編集できます。
5 種類のプリセット、ドラッグ・キーボード操作に対応します。
既存の背景属性と保存 HTML を保持し、公開画面では PHP と CSS のみで描画します。
詳細は同梱の README.md と docs/ を参照してください。

== Installation ==
1. 配布 ZIP を管理画面からインストールして有効化します。
2. グループなどの対応ブロックを選択します。
3. スタイル内の「メッシュグラデーション」を開きます。

== Changelog ==
= 0.1.2 =
* unitone のセクションとデコレーターに内蔵アダプターを追加。
* 可変 HTML タグ、リンク付きデコレーター、ボタン指定、入れ子の描画に対応。
* ルート属性の完全一致で背景の適用先を確認します。

= 0.1.1 =
* 選択中のプリセット名を表示するように修正。手動変更時は「カスタム」と表示します。
* 保存・再読み込み、Undo／Redo に合わせてプリセット表示を復元します。

= 0.1.0 =
* メッシュ編集 GUI、属性保存、エディター・公開画面描画、拡張フィルターを追加。
