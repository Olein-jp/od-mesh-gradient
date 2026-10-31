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
echo "PHP 統合テスト: " . $GLOBALS['od_mesh_checks'] . " 件成功\n";
