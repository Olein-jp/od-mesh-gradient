<?php
/**
 * Plugin Name: OD Mesh Gradient テスト用ブロック
 * Description: 自動テスト専用。配布 ZIP には含めません。
 */
add_action( 'init', function () {
 foreach ( array( 'color', 'background', 'plain', 'custom', 'forced', 'disabled', 'conflict' ) as $kind ) {
  $supports = $kind === 'background' ? array( 'background' => array( 'gradient' => true ) ) : array( 'color' => array( 'gradients' => ! in_array( $kind, array( 'plain', 'forced' ), true ) ) );
  $args = array( 'api_version' => 3, 'supports' => $supports, 'editor_script' => 'od-mesh-test-blocks' );
  if ( $kind === 'conflict' ) $args['attributes'] = array( 'odMeshGradient' => array( 'type' => 'string' ) );
  register_block_type( 'od-mesh-fixture/' . $kind, $args );
  if ( $kind !== 'plain' ) \OleinDesign\MeshGradient\Plugin::register_adapter( 'od-mesh-fixture/' . $kind, $kind === 'custom' ? 'div' : 'section', 'fixture-' . $kind, $kind === 'custom' ? ' > .fixture-custom' : '&' );
 }
 wp_register_script( 'od-mesh-test-blocks', plugins_url( 'blocks.js', __FILE__ ), array( 'wp-blocks', 'wp-block-editor', 'wp-element' ), '1', true );
});
add_filter( 'od_mesh_gradient_supported_blocks', function( $blocks ) { $blocks['od-mesh-fixture/forced'] = true; return $blocks; } );
add_filter( 'od_mesh_gradient_render_strategy', function( $strategy, $name ) { return $name === 'od-mesh-fixture/custom' ? 'custom' : ( $name === 'od-mesh-fixture/disabled' ? 'disabled' : $strategy ); }, 10, 2 );

// unitone の実際のルートクラス・可変タグ・内部構造を再現する互換性フィクスチャ。
add_action( 'init', function () {
 if ( WP_Block_Type_Registry::get_instance()->is_registered( 'unitone/section' ) ) return;
 wp_register_script( 'od-mesh-test-unitone-section', plugins_url( 'unitone-section.js', __FILE__ ), array( 'wp-blocks', 'wp-block-editor', 'wp-element' ), '1', true );
 register_block_type( 'unitone/section', array(
  'api_version' => 3,
  'attributes' => array( 'tagName' => array( 'type' => 'string', 'default' => 'section' ), 'containerAlign' => array( 'type' => 'string', 'default' => 'none' ) ),
  'selectors' => array( 'root' => '.unitone-section' ),
  'supports' => array( 'className' => false, 'background' => array( 'gradient' => true, 'backgroundImage' => true ), 'color' => array( 'background' => true, 'gradients' => true ) ),
  'editor_script' => 'od-mesh-test-unitone-section',
 ) );
}, 20 );

// デコレーターはクラスではなく data-unitone-layout のルートトークンを使う。
add_action( 'init', function () {
 if ( WP_Block_Type_Registry::get_instance()->is_registered( 'unitone/decorator' ) ) return;
 wp_register_script( 'od-mesh-test-unitone-decorator', plugins_url( 'unitone-decorator.js', __FILE__ ), array( 'wp-blocks', 'wp-block-editor', 'wp-element' ), '1', true );
 register_block_type( 'unitone/decorator', array(
  'api_version' => 3,
  'attributes' => array(
   'tagName' => array( 'type' => 'string', 'default' => 'div' ),
   'href' => array( 'type' => 'string', 'source' => 'attribute', 'selector' => 'a', 'attribute' => 'href' ),
   'linkText' => array( 'type' => 'string', 'source' => 'html', 'selector' => 'a' ),
   'linkTarget' => array( 'type' => 'string', 'source' => 'attribute', 'selector' => 'a', 'attribute' => 'target' ),
   'rel' => array( 'type' => 'string', 'source' => 'attribute', 'selector' => 'a', 'attribute' => 'rel' ),
  ),
  'selectors' => array( 'root' => '[data-unitone-layout~=decorator]' ),
  'supports' => array( 'className' => false, 'background' => array( 'gradient' => true, 'backgroundImage' => true ), 'color' => array( 'background' => true, 'gradients' => true ) ),
  'editor_script' => 'od-mesh-test-unitone-decorator',
 ) );
}, 20 );
