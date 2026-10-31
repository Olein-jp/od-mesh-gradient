import { useState, useRef } from '@wordpress/element';
import {
	PanelBody,
	ToggleControl,
	SelectControl,
	ColorPalette,
	ColorPicker,
	RangeControl,
	Button,
	Notice,
	BaseControl,
} from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import { valid, generateCSS, presets, defaultMesh } from '../utils/mesh';

export default function MeshGradientPanel( { value, onChange, compatible } ) {
	const mesh = valid( value ) ? value : defaultMesh();
	const [ selected, select ] = useState( mesh.points[ 0 ].id );
	const drag = useRef( null );
	const point =
		mesh.points.find( ( item ) => item.id === selected ) ||
		mesh.points[ 0 ];
	const update = ( patch ) => onChange( { ...mesh, ...patch } );
	const updatePoint = ( id, patch ) =>
		update( {
			points: mesh.points.map( ( item ) =>
				item.id === id ? { ...item, ...patch } : item
			),
		} );
	const move = ( event ) => {
		if ( ! drag.current ) return;
		const { rect, id } = drag.current;
		const clamp = ( v ) =>
			Math.round( Math.max( 0, Math.min( 100, v ) ) * 100 ) / 100;
		updatePoint( id, {
			x: clamp( ( ( event.clientX - rect.left ) / rect.width ) * 100 ),
			y: clamp( ( ( event.clientY - rect.top ) / rect.height ) * 100 ),
		} );
	};
	return (
		<PanelBody
			title={ __( 'メッシュグラデーション', 'od-mesh-gradient' ) }
			initialOpen={ false }
		>
			{ ! compatible && (
				<Notice status="warning" isDismissible={ false }>
					{ __(
						'このブロックは描画互換性が未確認です。対応アダプターを登録するまで背景を適用しません。',
						'od-mesh-gradient'
					) }
				</Notice>
			) }
			{ value && ! valid( value ) && (
				<Notice status="warning" isDismissible={ false }>
					{ __(
						'保存された設定を読み込めません。リセットして再設定してください。',
						'od-mesh-gradient'
					) }
				</Notice>
			) }
			<ToggleControl
				label={ __(
					'メッシュグラデーションを使用',
					'od-mesh-gradient'
				) }
				checked={ valid( value ) && value.enabled }
				disabled={ ! compatible }
				onChange={ ( enabled ) => update( { enabled } ) }
			/>
			{ valid( value ) && value.enabled && (
				<>
					<SelectControl
						label={ __( 'プリセット', 'od-mesh-gradient' ) }
						value=""
						options={ [
							{
								label: __(
									'選択してください',
									'od-mesh-gradient'
								),
								value: '',
							},
							...presets.map( ( preset, index ) => ( {
								label: preset.name,
								value: String( index ),
							} ) ),
						] }
						help={ __(
							'選択すると現在の設定を置き換えます。「元に戻す」で復元できます。',
							'od-mesh-gradient'
						) }
						onChange={ ( index ) => {
							if ( index !== '' ) {
								const next = JSON.parse(
									JSON.stringify(
										presets[ Number( index ) ].value
									)
								);
								onChange( next );
								select( next.points[ 0 ].id );
							}
						} }
					/>
					<p>
						{ __(
							'有効な間は既存の背景色・グラデーション・背景画像よりメッシュを優先します。無効にすると元の背景に戻ります。',
							'od-mesh-gradient'
						) }
					</p>
					<div
						className="od-mesh-preview"
						role="group"
						aria-label={ __(
							'メッシュのプレビュー。矢印キーでポイントを移動できます。',
							'od-mesh-gradient'
						) }
						style={ { backgroundImage: generateCSS( mesh ) } }
					>
						{ mesh.points.map( ( item, index ) => (
							<button
								key={ item.id }
								type="button"
								className={ `od-mesh-handle ${ point.id === item.id ? 'is-selected' : '' }` }
								style={ {
									left: `${ item.x }%`,
									top: `${ item.y }%`,
									backgroundColor: item.color,
								} }
								aria-label={ sprintf(
									__( 'ポイント %d', 'od-mesh-gradient' ),
									index + 1
								) }
								aria-pressed={ point.id === item.id }
								onClick={ () => select( item.id ) }
								onPointerDown={ ( event ) => {
									if ( event.button !== 0 ) return;
									select( item.id );
									drag.current = {
										id: item.id,
										rect: event.currentTarget.parentElement.getBoundingClientRect(),
									};
									event.currentTarget.setPointerCapture(
										event.pointerId
									);
								} }
								onPointerMove={ move }
								onPointerUp={ ( event ) => {
									drag.current = null;
									event.currentTarget.releasePointerCapture(
										event.pointerId
									);
								} }
								onPointerCancel={ () => {
									drag.current = null;
								} }
								onKeyDown={ ( event ) => {
									const delta = event.shiftKey ? 10 : 1;
									const keys = {
										ArrowLeft: [ 'x', -delta ],
										ArrowRight: [ 'x', delta ],
										ArrowUp: [ 'y', -delta ],
										ArrowDown: [ 'y', delta ],
									};
									if ( keys[ event.key ] ) {
										event.preventDefault();
										const [ key, step ] = keys[ event.key ];
										updatePoint( item.id, {
											[ key ]: Math.max(
												0,
												Math.min(
													100,
													item[ key ] + step
												)
											),
										} );
									}
								} }
							>
								{ index + 1 }
							</button>
						) ) }
					</div>
					<BaseControl
						label={ __( 'ベースカラー', 'od-mesh-gradient' ) }
					>
						<ColorPalette
							colors={ [] }
							clearable={ false }
							value={ mesh.baseColor }
							onChange={ ( baseColor ) => {
								if ( /^#[\da-f]{6}$/i.test( baseColor ) )
									update( { baseColor } );
							} }
						/>
					</BaseControl>
					<SelectControl
						label={ __( 'カラーポイント', 'od-mesh-gradient' ) }
						value={ point.id }
						options={ mesh.points.map( ( item, index ) => ( {
							label: sprintf(
								__( 'ポイント %d', 'od-mesh-gradient' ),
								index + 1
							),
							value: item.id,
						} ) ) }
						onChange={ select }
					/>
					<ColorPicker
						color={ point.color }
						enableAlpha={ false }
						onChange={ ( color ) => {
							if ( /^#[\da-f]{6}$/i.test( color ) )
								updatePoint( point.id, { color } );
						} }
					/>
					{ [
						[ 'x', __( 'X 座標 (%)', 'od-mesh-gradient' ), 0, 100 ],
						[ 'y', __( 'Y 座標 (%)', 'od-mesh-gradient' ), 0, 100 ],
						[
							'size',
							__( '広がり (%)', 'od-mesh-gradient' ),
							10,
							150,
						],
						[
							'opacity',
							__( '透明度 (%)', 'od-mesh-gradient' ),
							0,
							100,
						],
					].map( ( [ key, label, min, max ] ) => (
						<RangeControl
							key={ key }
							label={ label }
							value={ point[ key ] }
							min={ min }
							max={ max }
							onChange={ ( next ) => {
								if ( typeof next === 'number' )
									updatePoint( point.id, { [ key ]: next } );
							} }
						/>
					) ) }
					<div className="od-mesh-actions">
						<Button
							variant="secondary"
							disabled={ mesh.points.length >= 8 }
							onClick={ () => {
								let id;
								do {
									id = `point-${ Math.random().toString( 36 ).slice( 2, 12 ) }`;
								} while (
									mesh.points.some(
										( item ) => item.id === id
									)
								);
								update( {
									points: [
										...mesh.points,
										{
											id,
											color: '#6476d9',
											x: 50,
											y: 50,
											size: 65,
											opacity: 80,
										},
									],
								} );
								select( id );
							} }
						>
							{ __( 'ポイント追加', 'od-mesh-gradient' ) }
						</Button>
						<Button
							variant="secondary"
							isDestructive
							disabled={ mesh.points.length <= 2 }
							onClick={ () => {
								update( {
									points: mesh.points.filter(
										( item ) => item.id !== point.id
									),
								} );
								select(
									mesh.points.find(
										( item ) => item.id !== point.id
									).id
								);
							} }
						>
							{ __( 'ポイント削除', 'od-mesh-gradient' ) }
						</Button>
					</div>
				</>
			) }
			<Button
				variant="tertiary"
				onClick={ () => {
					onChange( undefined );
					select( 'point-1' );
				} }
			>
				{ __( '設定をリセット', 'od-mesh-gradient' ) }
			</Button>
		</PanelBody>
	);
}
