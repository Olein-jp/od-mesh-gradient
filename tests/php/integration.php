<?php
/** WordPress 環境で実行する統合テスト。 */
use OleinDesign\MeshGradient\AttributeValidator;
use OleinDesign\MeshGradient\CSSGenerator;
use OleinDesign\MeshGradient\Plugin;

$GLOBALS['od_mesh_checks'] = 0;
function od_mesh_assert( $condition, $message ) {
	global $od_mesh_checks;
	++$od_mesh_checks;
	if ( ! $condition ) { throw new RuntimeException( $message ); }
}
$mesh = array( 'version' => 1, 'enabled' => true, 'baseColor' => '#e7e4f6', 'points' => array(
 array( 'id' => 'point-1', 'color' => '#6476d9', 'x' => 20, 'y' => 20, 'size' => 65, 'opacity' => 80 ),
 array( 'id' => 'point-2', 'color' => '#e6a2d4', 'x' => 80, 'y' => 25, 'size' => 65, 'opacity' => 80 ),
 array( 'id' => 'point-3', 'color' => '#75d8c7', 'x' => 50, 'y' => 80, 'size' => 65, 'opacity' => 80 ),
) );
od_mesh_assert( AttributeValidator::valid( $mesh ), '正常な設定' );
foreach ( array( null, array(), array_merge( $mesh, array( 'version' => 2 ) ), array_merge( $mesh, array( 'points' => array_fill( 0, 9, $mesh['points'][0] ) ) ) ) as $bad ) { od_mesh_assert( ! AttributeValidator::valid( $bad ), '構造検証' ); }
foreach ( array( 'x' => -1, 'y' => 101, 'size' => 151, 'opacity' => '10', 'color' => '#fff;evil' ) as $key => $bad ) { $copy = $mesh; $copy['points'][0][$key] = $bad; od_mesh_assert( '' === CSSGenerator::generate( $copy ), '値検証' ); }
$css = CSSGenerator::generate( $mesh );
od_mesh_assert( str_starts_with( $css, 'radial-gradient(circle at 20% 20%,rgba(100,118,217,0.8)' ), 'レイヤー順' );
$html = '<div class="wp-block-group" style="color:red;background-image:url(old.jpg)"><p>本文</p></div>';
$block = array( 'blockName' => 'core/group', 'attrs' => array( 'odMeshGradient' => $mesh ) );
$output = Plugin::render( $html, $block );
od_mesh_assert( str_contains( $output, $css ), '背景適用' );
od_mesh_assert( str_contains( $output, 'color:red;background-image:url(old.jpg)' ), '既存スタイル保持' );
$block['attrs']['odMeshGradient']['enabled'] = false;
od_mesh_assert( Plugin::render( $html, $block ) === $html, '無効化で復元' );
$block['attrs']['odMeshGradient'] = $mesh;
foreach ( array( '<div><div class="wp-block-group">子要素</div></div>', '<div class="wp-block-group"></div><p>別ルート</p>', '<p>無関係</p>', 'text<div class="wp-block-group"></div>' ) as $unsafe ) { od_mesh_assert( Plugin::render( $unsafe, $block ) === $unsafe, '不明な構造を維持' ); }
od_mesh_assert( str_contains( Plugin::render( '<div class="wp-block-group"><div class="wp-block-group">子</div></div>', $block ), $css ), 'ネストされた同種ブロック' );
$block['blockName'] = 'core/html';
od_mesh_assert( Plugin::render( $html, $block ) === $html, '非対応を維持' );
$conflict = Plugin::attributes( array( 'attributes' => array( 'odMeshGradient' => array( 'type' => 'string' ) ) ), 'test/conflict' );
od_mesh_assert( $conflict['attributes']['odMeshGradient']['type'] === 'string', '競合属性を保持' );
register_block_type( 'od-mesh-test/background', array( 'supports' => array( 'background' => array( 'gradient' => true ) ) ) );
register_block_type( 'od-mesh-test/color', array( 'supports' => array( 'color' => array( 'gradients' => true ) ) ) );
register_block_type( 'od-mesh-test/plain' );
register_block_type( 'od-mesh-test/custom', array( 'supports' => array( 'color' => array( 'gradients' => true ) ) ) );
Plugin::register_adapter( 'od-mesh-test/background', 'section', 'test-background', '&' );
Plugin::register_adapter( 'od-mesh-test/color', 'section', 'test-color', '&' );
Plugin::register_adapter( 'od-mesh-test/custom', 'div', 'custom-surface', ' > .custom-surface' );
add_filter( 'od_mesh_gradient_render_strategy', function( $strategy, $name ) { return $name === 'od-mesh-test/custom' ? 'custom' : $strategy; }, 10, 2 );
Plugin::configure();
foreach ( array( 'background', 'color', 'custom' ) as $name ) { $block['blockName'] = 'od-mesh-test/' . $name; $fragment = $name === 'custom' ? '<section><div class="custom-surface">本文</div></section>' : '<section class="test-' . $name . '">本文</section>'; od_mesh_assert( str_contains( Plugin::render( $fragment, $block ), $css ), 'フィクスチャ ' . $name ); }
add_filter( 'od_mesh_gradient_supported_blocks', function( $blocks ) { $blocks['core/group'] = false; return $blocks; } );
Plugin::configure();
$block['blockName'] = 'core/group';
od_mesh_assert( Plugin::render( $html, $block ) === $html, '除外フィルター' );
register_block_type( 'od-mesh-test/dynamic', array( 'supports' => array( 'background' => array( 'gradient' => true ) ), 'render_callback' => function() { return '<section class="test-dynamic">動的本文</section>'; } ) );
Plugin::register_adapter( 'od-mesh-test/dynamic', 'section', 'test-dynamic', '&' );
Plugin::configure();
$dynamic = render_block( array( 'blockName' => 'od-mesh-test/dynamic', 'attrs' => array( 'odMeshGradient' => $mesh ), 'innerBlocks' => array(), 'innerHTML' => '', 'innerContent' => array() ) );
od_mesh_assert( str_contains( $dynamic, $css ) && str_contains( $dynamic, '動的本文' ), '動的ブロック' );
$copy = $mesh; $copy['points'][1]['id'] = $copy['points'][0]['id']; od_mesh_assert( ! AttributeValidator::valid( $copy ), 'ID 重複' );
$copy = $mesh; $copy['points'][0]['size'] = 150; $copy['points'][0]['x'] = 0; $copy['points'][0]['opacity'] = 0; od_mesh_assert( AttributeValidator::valid( $copy ), '数値境界' );
if ( ! WP_Block_Type_Registry::get_instance()->is_registered( 'unitone/section' ) ) {
 register_block_type( 'unitone/section', array( 'supports' => array( 'className' => false, 'background' => array( 'gradient' => true ), 'color' => array( 'gradients' => true ) ) ) );
}
Plugin::configure();
$block['blockName'] = 'unitone/section';
$block['attrs']['odMeshGradient'] = $mesh;
foreach ( array( 'main', 'section', 'article', 'aside', 'header', 'footer', 'div' ) as $tag ) {
 $fragment = '<' . $tag . ' class="unitone-section" style="color:red;background-image:url(old.jpg)"><div data-unitone-layout="gutters"><div data-unitone-layout="container"><div data-unitone-layout="stack"><p>本文</p></div></div></div></' . $tag . '>';
 $rendered = Plugin::render( $fragment, $block );
 $parser = new WP_HTML_Tag_Processor( $rendered ); $parser->next_tag();
 od_mesh_assert( $parser->has_class( 'unitone-section' ) && str_contains( $parser->get_attribute( 'style' ), $css ), 'unitone のルート適用 ' . $tag );
 od_mesh_assert( str_contains( $rendered, 'color:red;background-image:url(old.jpg)' ) && str_contains( $rendered, '<div data-unitone-layout="stack"><p>本文</p></div>' ), 'unitone の元スタイル・内部構造保持 ' . $tag );
 $disabled = $block; $disabled['attrs']['odMeshGradient']['enabled'] = false;
 od_mesh_assert( Plugin::render( $fragment, $disabled ) === $fragment, 'unitone の無効化 ' . $tag );
}
$nested = '<section class="unitone-section"><div data-unitone-layout="gutters"><section class="unitone-section">内側</section></div></section>';
$rendered = Plugin::render( $nested, $block );
od_mesh_assert( substr_count( $rendered, $css ) === 1 && str_contains( $rendered, '<section class="unitone-section">内側</section>' ), 'unitone の入れ子に誤適用しない' );
$unknown = '<section><div class="unitone-section">構造の変更</div></section>';
od_mesh_assert( Plugin::render( $unknown, $block ) === $unknown, 'unitone の未知の構造は維持' );
add_filter( 'od_mesh_gradient_render_strategy', function( $strategy, $name ) { return $name === 'unitone/section' ? 'disabled' : $strategy; }, 10, 2 );
Plugin::configure();
od_mesh_assert( Plugin::render( $nested, $block ) === $nested, 'unitone 対応も除外設定を尊重' );
if ( ! WP_Block_Type_Registry::get_instance()->is_registered( 'unitone/decorator' ) ) {
 register_block_type( 'unitone/decorator', array( 'supports' => array( 'className' => false, 'background' => array( 'gradient' => true ), 'color' => array( 'gradients' => true ) ) ) );
}
Plugin::configure();
$block['blockName'] = 'unitone/decorator';
foreach ( array( 'main', 'section', 'article', 'aside', 'header', 'footer', 'div' ) as $tag ) {
 foreach ( array( false, true ) as $linked ) {
  $content = $linked ? '<div data-unitone-layout="decorator__inner"><div><p>本文</p></div><a data-unitone-layout="decorator__link" href="/details" target="_blank" rel="noopener">詳細</a></div>' : '<p>本文</p>';
  $fragment = '<' . $tag . ' data-unitone-layout="decorator' . ( $linked ? ' -has-link' : '' ) . '" style="color:red;background-image:url(old.jpg)">' . $content . '</' . $tag . '>';
  $rendered = Plugin::render( $fragment, $block );
  $parser = new WP_HTML_Tag_Processor( $rendered ); $parser->next_tag();
  od_mesh_assert( str_contains( $parser->get_attribute( 'style' ), $css ) && str_contains( $rendered, 'color:red;background-image:url(old.jpg)' ) && str_contains( $rendered, $content ), 'デコレーターのルート適用・リンク保持 ' . $tag . ( $linked ? ' リンクあり' : '' ) );
  $disabled = $block; $disabled['attrs']['odMeshGradient']['enabled'] = false;
  od_mesh_assert( Plugin::render( $fragment, $disabled ) === $fragment, 'デコレーターの無効化 ' . $tag );
 }
}
$button = '<div role="button" data-unitone-layout="decorator"><p>ボタン本文</p></div>';
od_mesh_assert( str_contains( Plugin::render( $button, $block ), $css ) && str_contains( Plugin::render( $button, $block ), 'role="button"' ), 'デコレーターのボタン指定保持' );
$nested = '<div data-unitone-layout="decorator"><div data-unitone-layout="decorator">子</div></div>';
od_mesh_assert( substr_count( Plugin::render( $nested, $block ), $css ) === 1 && str_contains( Plugin::render( $nested, $block ), '<div data-unitone-layout="decorator">子</div>' ), 'デコレーターの子に誤適用しない' );
foreach ( array( 'decorator__inner', 'decorator__link', 'not-decorator', 'decorator-other', 'DECORATOR' ) as $token ) {
 $unsafe = '<div data-unitone-layout="' . $token . '"><div data-unitone-layout="decorator">子</div></div>';
 od_mesh_assert( Plugin::render( $unsafe, $block ) === $unsafe, 'デコレーターの完全一致 ' . $token );
}
$whitespace = "<div data-unitone-layout=\"-has-link\tdecorator\n-padding:1\"><p>空白</p></div>";
od_mesh_assert( str_contains( Plugin::render( $whitespace, $block ), $css ), 'デコレーターの HTML 空白トークン' );
$missing = '<div data-unitone-layout><p>属性の値がない</p></div>';
od_mesh_assert( Plugin::render( $missing, $block ) === $missing, 'デコレーターの属性値がない場合' );
add_filter( 'od_mesh_gradient_supported_blocks', function( $blocks ) { $blocks['unitone/decorator'] = false; return $blocks; } );
Plugin::configure();
od_mesh_assert( Plugin::render( $button, $block ) === $button, 'デコレーターも除外フィルターを尊重' );
echo "PHP 統合テスト: " . $GLOBALS['od_mesh_checks'] . " 件成功\n";
