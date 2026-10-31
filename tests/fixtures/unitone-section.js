/* unitone 公式ソースのマークアップに合わせた、テーマ本体に依存しない検証用ブロック。 */
/* 調査元: inc2734/unitone @ 57b6fae8241a8c36fc862d0bf49dc4155312784a */
if ( ! wp.blocks.getBlockType( 'unitone/section' ) ) {
	const el = wp.element.createElement;
	const content = ( attributes, innerProps ) =>
		el(
			'div',
			{ 'data-unitone-layout': 'gutters' },
			el(
				'div',
				{
					'data-unitone-layout': `container${ attributes.containerAlign === 'none' ? '' : ` -align:${ attributes.containerAlign }` }`,
				},
				el( 'div', innerProps )
			)
		);
	wp.blocks.registerBlockType( 'unitone/section', {
		apiVersion: 3,
		title: 'unitone セクション互換性フィクスチャ',
		category: 'design',
		edit: ( { attributes } ) => {
			const props = wp.blockEditor.useBlockProps( {
				className: 'unitone-section',
			} );
			const innerProps = wp.blockEditor.useInnerBlocksProps( {
				'data-unitone-layout': 'stack',
			} );
			return el(
				attributes.tagName,
				props,
				content( attributes, innerProps )
			);
		},
		save: ( { attributes } ) =>
			el(
				attributes.tagName,
				wp.blockEditor.useBlockProps.save( {
					className: 'unitone-section',
				} ),
				content(
					attributes,
					wp.blockEditor.useInnerBlocksProps.save( {
						'data-unitone-layout': 'stack',
					} )
				)
			),
	} );
}
