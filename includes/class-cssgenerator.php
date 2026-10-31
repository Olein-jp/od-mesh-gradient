<?php
/**
 * 検証済みデータから CSS を生成。
 *
 * @package OD_Mesh_Gradient
 */

namespace OleinDesign\MeshGradient;

/** 背景レイヤーの生成。 */
final class CSSGenerator {
	/**
	 * PHP と JavaScript で同じレイヤー順を使う。
	 *
	 * @param mixed $value メッシュ属性.
	 */
	public static function generate( $value ): string {
		if ( ! AttributeValidator::valid( $value ) || ! $value['enabled'] ) {
			return '';
		}
		$layers = array();
		foreach ( $value['points'] as $point ) {
			$hex      = substr( $point['color'], 1 );
			$channels = array( hexdec( substr( $hex, 0, 2 ) ), hexdec( substr( $hex, 2, 2 ) ), hexdec( substr( $hex, 4, 2 ) ) );
			$layers[] = sprintf( 'radial-gradient(circle at %s%% %s%%,rgba(%d,%d,%d,%s) 0%%,rgba(%d,%d,%d,0) %s%%)', self::number( $point['x'] ), self::number( $point['y'] ), ...array_merge( $channels, array( self::number( $point['opacity'] / 100 ) ), $channels, array( self::number( $point['size'] ) ) ) );
		}
		$layers[] = sprintf( 'linear-gradient(%1$s,%1$s)', $value['baseColor'] );
		return implode( ',', $layers );
	}

	/**
	 * ロケール非依存の CSS 数値を生成する。
	 *
	 * @param float|int $value 数値.
	 */
	private static function number( $value ): string {
		return rtrim( rtrim( number_format( $value, 4, '.', '' ), '0' ), '.' );
	}
}
