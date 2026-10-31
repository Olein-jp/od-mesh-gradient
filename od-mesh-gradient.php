<?php
/**
 * Plugin Name: OD Mesh Gradient
 * Plugin URI: https://github.com/Olein-jp/od-mesh-gradient
 * Description: Visual mesh gradients for supported WordPress blocks.
 * Version: 0.1.2
 * Requires at least: 7.1
 * Requires PHP: 8.2
 * Author: Koji Kuno
 * Author URI: https://olein-design.com
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: od-mesh-gradient
 * Domain Path: /languages
 * Update URI: https://github.com/Olein-jp/od-mesh-gradient
 *
 * @package OD_Mesh_Gradient
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * 翻訳と GitHub 更新機能を初期化する。
 *
 * @return void
 */
function od_mesh_gradient_init() {
	load_plugin_textdomain( 'od-mesh-gradient', false, dirname( plugin_basename( __FILE__ ) ) . '/languages' );

	$autoload = __DIR__ . '/vendor/autoload.php';
	if ( ! file_exists( $autoload ) ) {
		add_action( 'admin_notices', 'od_mesh_gradient_dependency_notice' );
		return;
	}

	require_once $autoload;

	new \Inc2734\WP_GitHub_Plugin_Updater\Bootstrap(
		plugin_basename( __FILE__ ),
		'Olein-jp',
		'od-mesh-gradient'
	);
}
add_action( 'init', 'od_mesh_gradient_init' );

/**
 * 開発用ソースに依存パッケージがない場合の案内を表示する。
 *
 * @return void
 */
function od_mesh_gradient_dependency_notice() {
	if ( ! current_user_can( 'activate_plugins' ) ) {
		return;
	}
	?>
	<div class="notice notice-error">
		<p><?php esc_html_e( 'OD Mesh Gradient: Dependencies are missing. Run composer install or install the ZIP from GitHub Releases.', 'od-mesh-gradient' ); ?></p>
	</div>
	<?php
}

require_once __DIR__ . '/includes/class-attributevalidator.php';
require_once __DIR__ . '/includes/class-cssgenerator.php';
require_once __DIR__ . '/includes/class-plugin.php';
\OleinDesign\MeshGradient\Plugin::boot();
