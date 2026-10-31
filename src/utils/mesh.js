export const valid = ( value ) => {
	const hex = ( color ) =>
		typeof color === 'string' &&
		color.length === 7 &&
		/^#[\da-f]{6}$/i.test( color );
	if (
		! value ||
		typeof value !== 'object' ||
		Object.keys( value ).length !== 4 ||
		value.version !== 1 ||
		typeof value.enabled !== 'boolean' ||
		! hex( value.baseColor ) ||
		! Array.isArray( value.points ) ||
		value.points.length < 2 ||
		value.points.length > 8 ||
		Object.keys( value.points ).length !== value.points.length
	)
		return false;
	const ids = new Set();
	return value.points.every( ( point ) => {
		if (
			! point ||
			Object.keys( point ).length !== 6 ||
			typeof point.id !== 'string' ||
			point.id.length < 1 ||
			point.id.length > 64 ||
			/[^a-zA-Z0-9_-]/.test( point.id ) ||
			ids.has( point.id ) ||
			! hex( point.color )
		)
			return false;
		ids.add( point.id );
		return Object.entries( {
			x: [ 0, 100 ],
			y: [ 0, 100 ],
			size: [ 10, 150 ],
			opacity: [ 0, 100 ],
		} ).every(
			( [ key, [ min, max ] ] ) =>
				typeof point[ key ] === 'number' &&
				Number.isFinite( point[ key ] ) &&
				point[ key ] >= min &&
				point[ key ] <= max
		);
	} );
};
const number = ( value ) => Number( value.toFixed( 4 ) ).toString();
export const generateCSS = ( value ) => {
	if ( ! valid( value ) || ! value.enabled ) return '';
	return [
		...value.points.map( ( point ) => {
			const rgb = [ 1, 3, 5 ]
				.map( ( offset ) =>
					parseInt( point.color.slice( offset, offset + 2 ), 16 )
				)
				.join( ',' );
			return `radial-gradient(circle at ${ number( point.x ) }% ${ number( point.y ) }%,rgba(${ rgb },${ number( point.opacity / 100 ) }) 0%,rgba(${ rgb },0) ${ number( point.size ) }%)`;
		} ),
		`linear-gradient(${ value.baseColor },${ value.baseColor })`,
	].join( ',' );
};
export const presets = [
	[ 'Soft Pastel', '#e7e4f6', [ '#6476d9', '#e6a2d4', '#75d8c7' ] ],
	[ 'Ocean Breeze', '#d8f3fa', [ '#1677b8', '#36c8c1', '#8bcce8' ] ],
	[
		'Sunset Glow',
		'#ffe4ce',
		[ '#ee6859', '#f4ae55', '#bc6ec9', '#f199ba' ],
	],
	[
		'Midnight Aurora',
		'#101832',
		[ '#3156ba', '#23bba1', '#9252d1', '#2d708c' ],
	],
	[ 'Neutral Mist', '#ece9e3', [ '#aaa7a2', '#d8c8ba', '#c3ccd2' ] ],
].map( ( [ name, baseColor, colors ] ) => ( {
	name,
	value: {
		version: 1,
		enabled: true,
		baseColor,
		points: colors.map( ( color, index ) => ( {
			id: `point-${ index + 1 }`,
			color,
			x: [ 20, 80, 50, 15 ][ index ],
			y: [ 20, 25, 80, 70 ][ index ],
			size: 65,
			opacity: 80,
		} ) ),
	},
} ) );
/** 保存された設定から一致するプリセットを判定する。ID と有効状態は比較しない。 */
export const getPresetValue = ( mesh ) => {
	if ( ! valid( mesh ) ) return '';
	const index = presets.findIndex(
		( { value } ) =>
			mesh.baseColor.toLowerCase() === value.baseColor.toLowerCase() &&
			mesh.points.length === value.points.length &&
			mesh.points.every( ( point, pointIndex ) => {
				const presetPoint = value.points[ pointIndex ];
				return (
					point.color.toLowerCase() ===
						presetPoint.color.toLowerCase() &&
					[ 'x', 'y', 'size', 'opacity' ].every(
						( key ) => point[ key ] === presetPoint[ key ]
					)
				);
			} )
	);
	return index === -1 ? '' : String( index );
};
export const defaultMesh = () =>
	JSON.parse( JSON.stringify( presets[ 0 ].value ) );
export const candidate = ( entry, supports ) =>
	Boolean(
		entry?.supported &&
		( entry.override ||
			entry.declared ===
				( supports?.color?.gradients === true ||
					supports?.background?.gradient === true ) )
	);
