# 開発者向け技術仕様

## 属性と候補判定

PHP namespace は `OleinDesign\MeshGradient`。属性名は `odMeshGradient`、スキーマは `{ type: 'object' }`。属性はブロックコメントに保存し、保存用 React 要素にフィルターを適用しません。

PHP の `register_block_type_args` をプラグイン読込時に登録します。後からフィルターで追加するブロックにも属性を保持できるよう、サーバー登録ブロックに属性の保存領域を用意し、候補判定は `wp_loaded` で行います。同名属性が既にある場合はその登録を保持して機能を停止します。後続フィルターによるスキーマ変更も最終登録情報と比較します。

候補は WordPress の登録済みブロック情報で `color.gradients` または `background.gradient` が明示的に true のものです。PHP の判定とアダプターを JSON としてエディターへ渡し、JS の登録情報とも照合します。JS 側だけの登録は対象外です。不一致はブラウザコンソールに一度記録します。

## 検証と CSS

version は整数 1 のみ、enabled は boolean、色は 6 桁 HEX、ポイントは 2〜8 個です。ID は英数字・ハイフン・アンダースコアの 1〜64 文字で重複を拒否します。数値型のみを許可し、座標・透明度は 0〜100、広がりは 10〜150。余分なキー、将来の未知バージョン、不正な型・色は拒否します。無効なデータは描画しません。エディターにはリセット案内を表示します。

CSS は任意入力を受け付けず、検証後に生成します。先頭ポイントから radial-gradient を並べ、最後に不透明なベースカラーの linear-gradient を置きます。フェード終端は同色の alpha 0 とし、透明黒との補間を避けます。数値は小数点以下 4 桁へ丸め、ロケールに依存しません。

## 既存背景と描画

WordPress 7.1 の `background.gradient` は `style.background.gradient` に保存され、背景画像と一つの `background-image` に合成されます。従来の `color.gradients` は `style.color.gradient`／プリセット属性 `gradient` を利用し、background shorthand を含む出力です。

公開画面では `render_block` の優先度 100 で標準背景処理後に CSS を追記します。既存スタイル宣言を保持し、background-image、background-size、background-position、background-repeat を末尾に追加します。メッシュのベースレイヤーが背景色を覆います。停止時や無効化時には本文の元の HTML がそのまま使われます。

`WP_HTML_Processor` で単一のルート要素を確認します。ルート外の非空テキスト、複数ルート、不完全・解析不能な HTML は変更しません。標準アダプターはルートの既知クラスを確認します。段落は既定クラスを持たないため、既知の P ルートを確認します。書換えには `WP_HTML_Tag_Processor` を使います。構造検証の走査はそのブロックの HTML 内に限定します。

エディターは `editor.BlockEdit` と `InspectorControls group="styles"` を使います。`editor.BlockListBlock` で iframe 内に React の style 要素を出し、WordPress の `data-block` でそのブロックだけにスコープを絞ります。DOM の探索・直接変更や親 document への依存はありません。既存のインライン背景を上書きするため、この限定的なエディター描画規則では `!important` を使用します。公開側には使用しません。サイドバー CSS は `enqueue_block_editor_assets` で読み込みます。キャンバス用の静的 CSS は不要です。

## 独自フィルターと描画アダプター

対応候補の追加・除外だけでは、未知の HTML には背景を適用しません。アダプターをセットで登録してください。フィルターはプラグイン読込時、アダプターは init の処理中など wp_loaded より前に登録します。

```php
add_filter( 'od_mesh_gradient_supported_blocks', function ( $blocks ) {
    $blocks['vendor/custom-section'] = true;
    $blocks['vendor/special-block'] = false;
    return $blocks;
} );

add_action( 'init', function () {
    // 既知の SECTION ルートとクラス、エディターのルートを指定。
    \OleinDesign\MeshGradient\Plugin::register_adapter(
        'vendor/custom-section', 'section', 'vendor-section', '&'
    );
}, 20 );

add_filter( 'od_mesh_gradient_render_strategy', function ( $strategy, $name ) {
    return $name === 'vendor/custom-section' ? 'root' : $strategy;
}, 10, 2 );
```

- `auto`: 内蔵または登録済みのアダプターを使用。
- `root`: 確認済みアダプターを使用。未知の先頭要素への強制適用はしません。
- `custom`: 外部登録したアダプターが必要。
- `disabled`: UI からの有効化と描画を停止。保存済み属性は保持。

独自の内側背景要素を指定する例:

```php
add_action( 'init', function () {
    \OleinDesign\MeshGradient\Plugin::register_adapter(
        'vendor/panel', 'div', 'vendor-panel-surface', ' > .vendor-panel-surface'
    );
}, 20 );
add_filter( 'od_mesh_gradient_render_strategy', function ( $strategy, $name ) {
    return $name === 'vendor/panel' ? 'custom' : $strategy;
}, 10, 2 );
```

任意の HTML 文字列を返すコールバックは許可せず、タグ・クラス・制限された CSS セレクターによる宣言を受け付けます。独自アダプターの作者は編集・公開の構造が対応することを確認してください。公開 HTML に対象クラスが複数ある場合は曖昧なためスキップします。

## 調査資料

実装時に WordPress 7.1.4 の実際のソースで以下を確認しました。

- `wp-includes/block-supports/background.php` の属性と render_block 優先度
- `wp-includes/block-supports/generated-classname.php` のクラス名生成
- `wp-includes/html-api/` のトークン深度とタグ書換え
- `wp-includes/js/dist/block-editor.js` の BlockListBlock／data-block
- `wp-includes/blocks/*/block.json` の supports

公式資料:

- [7.1 Background Gradient](https://make.wordpress.org/core/2026/07/26/new-block-support-in-wordpress-7-1-background-gradient-background-gradient/)
- [Block Filters](https://developer.wordpress.org/block-editor/reference-guides/filters/block-filters/)
- [Editor assets と iframe](https://developer.wordpress.org/block-editor/how-to-guides/enqueueing-assets-in-the-editor/)

実験的な WordPress API は使用していません。ビルドは @wordpress/scripts の依存抽出を使い、WordPress 同梱パッケージを外部依存として参照します。
