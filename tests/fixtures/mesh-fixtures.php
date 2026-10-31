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
