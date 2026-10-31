<?php
/**
 * メッシュ属性の検証。
 *
 * @package OD_Mesh_Gradient
 */

namespace OleinDesign\MeshGradient;

/** 保存属性の厳格な検証。 */
final class AttributeValidator {
	/**
	 * 許可された構造だけを受け入れる。
	 *
	 * @param mixed $value 検証する値.
	 */
	public static function valid( $value ): bool {
		if ( ! is_array( $value ) || count( $value ) !== 4 || ! isset( $value['version'], $value['enabled'], $value['baseColor'], $value['points'] ) ) {
			return false;
		}
		if ( 1 !== $value['version'] || ! is_bool( $value['enabled'] ) || ! self::hex( $value['baseColor'] ) || ! is_array( $value['points'] ) || ! array_is_list( $value['points'] ) || count( $value['points'] ) < 2 || count( $value['points'] ) > 8 ) {
			return false;
		}
		$ids = array();
		foreach ( $value['points'] as $point ) {
			if ( ! is_array( $point ) || count( $point ) !== 6 || ! isset( $point['id'], $point['color'], $point['x'], $point['y'], $point['size'], $point['opacity'] ) || ! is_string( $point['id'] ) || ! preg_match( '/^[a-zA-Z0-9_-]{1,64}$/D', $point['id'] ) || isset( $ids[ $point['id'] ] ) || ! self::hex( $point['color'] ) ) {
				return false;
			}
			$ids[ $point['id'] ] = true;
			foreach ( array(
				'x'       => array( 0, 100 ),
				'y'       => array( 0, 100 ),
				'size'    => array( 10, 150 ),
				'opacity' => array( 0, 100 ),
			) as $key => $range ) {
				$number = $point[ $key ];
				if ( ! ( is_int( $number ) || is_float( $number ) ) || ! is_finite( (float) $number ) || $number < $range[0] || $number > $range[1] ) {
					return false;
				}
			}
		}
		return true;
	}

	/**
	 * HEX カラーを検証する。
	 *
	 * @param mixed $value 色の値.
	 */
	private static function hex( $value ): bool {
		return is_string( $value ) && 1 === preg_match( '/^#[0-9a-fA-F]{6}$/D', $value );
	}
}
