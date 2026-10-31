<?php
/**
 * ブロック属性、互換性、描画処理。
 *
 * @package OD_Mesh_Gradient
 */

namespace OleinDesign\MeshGradient;

/** プラグインの統合処理。 */
final class Plugin {
	/** 属性を登録したブロック。
	 *
	 * @var array
	 */
	private static array $owned = array();
	/** 判定結果。
	 *
	 * @var array
	 */
	private static array $config = array();
	/** 描画アダプター。
	 *
	 * @var array
	 */
	private static array $adapters = array();

	/** フックを登録する。 */
	public static function boot(): void {
		add_filter( 'register_block_type_args', array( self::class, 'attributes' ), 100, 2 );
		add_action( 'wp_loaded', array( self::class, 'configure' ) );
		add_action( 'enqueue_block_editor_assets', array( self::class, 'editor' ) );
		add_filter( 'render_block', array( self::class, 'render' ), 100, 2 );
	}

	/**
	 * 属性を確保する。候補の決定は登録完了後に行う。
	 *
	 * @param array  $args ブロック設定.
	 * @param string $name ブロック名.
	 */
	public static function attributes( array $args, string $name ): array {
		if ( array_key_exists( 'odMeshGradient', $args['attributes'] ?? array() ) ) {
			unset( self::$owned[ $name ] );
			return $args;
		}
		$args['attributes']['odMeshGradient'] = array( 'type' => 'object' );
		self::$owned[ $name ]                 = true;
		return $args;
	}

	/**
	 * 外部プラグインが既知の描画対象を宣言する。
	 *
	 * @param string $name ブロック名.
	 * @param string $tag 対象タグ.
	 * @param string $class_name 対象クラス.
	 * @param string $editor_selector ルート相対セレクター.
	 */
	public static function register_adapter( string $name, string $tag, string $class_name, string $editor_selector ): void {
		if ( preg_match( '/^[a-z][a-z0-9]*$/D', $tag ) && preg_match( '/^[a-zA-Z0-9_-]+$/D', $class_name ) && preg_match( '/^(?:&|(?:[ >]*\.[a-zA-Z0-9_-]+)+)$/D', $editor_selector ) ) {
			self::$adapters[ $name ] = array(
				'tag'       => strtoupper( $tag ),
				'className' => $class_name,
				'selector'  => $editor_selector,
			);
		}
	}

	/** サーバーの決定をエディターへ共有する。 */
	public static function configure(): void {
		$overrides = apply_filters( 'od_mesh_gradient_supported_blocks', array() );
		$overrides = is_array( $overrides ) ? $overrides : array();
		foreach ( \WP_Block_Type_Registry::get_instance()->get_all_registered() as $name => $type ) {
			$declared = true === ( $type->supports['color']['gradients'] ?? false ) || true === ( $type->supports['background']['gradient'] ?? false );
			$override = $overrides[ $name ] ?? null;
			$support  = is_bool( $override ) ? $override : $declared;
			$strategy = apply_filters( 'od_mesh_gradient_render_strategy', 'auto', $name );
			$adapter  = self::$adapters[ $name ] ?? null;
			if ( ! $adapter && in_array( $name, array( 'core/group', 'core/columns', 'core/column', 'core/paragraph', 'core/heading', 'core/quote', 'core/pullquote', 'core/verse', 'core/post-content' ), true ) ) {
				$adapter = array(
					'tag'       => 'core/paragraph' === $name ? 'P' : '',
					'className' => 'core/paragraph' === $name ? '' : wp_get_block_default_classname( $name ),
					'selector'  => '&',
				);
			}
			// unitone は既定クラスを使わず、HTML タグを変更しても専用ルートクラスを維持する.
			if ( ! $adapter && 'unitone/section' === $name ) {
				$adapter = array(
					'tag'       => '',
					'className' => 'unitone-section',
					'selector'  => '&',
				);
			}
			if ( ! $adapter && 'unitone/decorator' === $name ) {
				$adapter = array(
					'tag'       => '',
					'className' => '',
					'selector'  => '&',
					'attribute' => array(
						'name'  => 'data-unitone-layout',
						'token' => 'decorator',
					),
				);
			}
			if ( ! in_array( $strategy, array( 'auto', 'root', 'custom' ), true ) || ! $adapter || ( 'custom' === $strategy && ! isset( self::$adapters[ $name ] ) ) ) {
				$adapter = null;
			}
			self::$config[ $name ] = array(
				'supported' => $support && isset( self::$owned[ $name ] ) && array( 'type' => 'object' ) === ( $type->attributes['odMeshGradient'] ?? null ),
				'declared'  => $declared,
				'override'  => is_bool( $override ),
				'adapter'   => $adapter,
			);
		}
	}

	/** エディター資産を読み込む。 */
	public static function editor(): void {
		$asset = require dirname( __DIR__ ) . '/build/index.asset.php';
		$url   = plugin_dir_url( dirname( __DIR__ ) . '/od-mesh-gradient.php' );
		wp_enqueue_script( 'od-mesh-gradient', $url . 'build/index.js', $asset['dependencies'], $asset['version'], true );
		wp_add_inline_script( 'od-mesh-gradient', 'window.odMeshGradientConfig=' . wp_json_encode( self::$config ) . ';', 'before' );
		wp_enqueue_style( 'od-mesh-gradient-editor', $url . 'build/index.css', array( 'wp-components' ), $asset['version'] );
		wp_set_script_translations( 'od-mesh-gradient', 'od-mesh-gradient', dirname( __DIR__ ) . '/languages' );
	}

	/**
	 * HTML API で対象を検証し、既存スタイルを保持して背景を追加する。
	 *
	 * @param string $html 描画結果.
	 * @param array  $block ブロック情報.
	 */
	public static function render( string $html, array $block ): string {
		$value = $block['attrs']['odMeshGradient'] ?? null;
		$css   = CSSGenerator::generate( $value );
		$entry = self::$config[ $block['blockName'] ?? '' ] ?? null;
		if ( '' === $css || empty( $entry['supported'] ) || empty( $entry['adapter'] ) ) {
			return $html;
		}
		$adapter = $entry['adapter'];
		$tree    = \WP_HTML_Processor::create_fragment( $html );
		$roots   = 0;
		while ( $tree->next_token() ) {
			if ( '#tag' === $tree->get_token_type() && ! $tree->is_tag_closer() && 3 === $tree->get_current_depth() ) {
				++$roots;
			}
			if ( '#text' === $tree->get_token_type() && $tree->get_current_depth() <= 3 && '' !== trim( $tree->get_modifiable_text() ) ) {
				return $html;
			}
		}
		if ( 1 !== $roots || $tree->get_last_error() || $tree->paused_at_incomplete_token() ) {
			return $html;
		}
		$tags = new \WP_HTML_Tag_Processor( $html );
		if ( '&' === $adapter['selector'] ) {
			if ( ! $tags->next_tag() || ( $adapter['className'] && ! $tags->has_class( $adapter['className'] ) ) || ( $adapter['tag'] && $tags->get_tag() !== $adapter['tag'] ) ) {
				return $html;
			}
			if ( isset( $adapter['attribute'] ) ) {
				$attribute = $adapter['attribute'];
				$layout    = $tags->get_attribute( $attribute['name'] );
				// HTML の空白区切りトークンに一致させ、decorator__inner 等は拒否する.
				if ( ! is_string( $layout ) || ! in_array( $attribute['token'], preg_split( '/[\x09\x0a\x0c\x0d\x20]+/', $layout ), true ) ) {
					return $html;
				}
			}
		} else {
			$query = array( 'class_name' => $adapter['className'] );
			if ( $adapter['tag'] ) {
				$query['tag_name'] = $adapter['tag'];
			}
			if ( ! $tags->next_tag( $query ) ) {
				return $html;
			}
			$tags->set_bookmark( 'mesh' );
			if ( $tags->next_tag( $query ) ) {
				return $html;
			}
			$tags->seek( 'mesh' );
		}
		$existing = $tags->get_attribute( 'style' );
		$existing = is_string( $existing ) ? $existing : '';
		$tags->set_attribute( 'style', rtrim( $existing, '; ' ) . ';background-image:' . $css . ';background-size:100% 100%;background-position:0 0;background-repeat:no-repeat;' );
		return $tags->get_updated_html();
	}
}
