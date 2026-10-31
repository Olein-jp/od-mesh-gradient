/* unitone 公式ソースのリンク有無・ボタン指定を再現する検証用ブロック。 */
/* 調査元: inc2734/unitone @ 57b6fae8241a8c36fc862d0bf49dc4155312784a */
if ( ! wp.blocks.getBlockType( 'unitone/decorator' ) ) {
	const el = wp.element.createElement;
	wp.blocks.registerBlockType( 'unitone/decorator', {
		apiVersion: 3,
		title: 'unitone デコレーター互換性フィクスチャ',
		category: 'design',
		edit: ( { attributes } ) => {
			const props = wp.blockEditor.useBlockProps( {
				'data-unitone-layout': `decorator${ attributes.href ? ' -has-link' : '' }`,
				'data-unitone-tag-name': attributes.tagName,
			} );
			const innerProps = wp.blockEditor.useInnerBlocksProps(
				attributes.href ? {} : props
			);
			return el(
				attributes.tagName === 'button' ? 'div' : attributes.tagName,
				attributes.href ? props : innerProps,
				attributes.href
					? el(
							'div',
							{ 'data-unitone-layout': 'decorator__inner' },
							el( 'div', innerProps )
						)
					: innerProps.children
			);
		},
		save: ( { attributes } ) => {
			const props = wp.blockEditor.useBlockProps.save( {
				'data-unitone-layout': `decorator${ attributes.href ? ' -has-link' : '' }`,
				...( attributes.tagName === 'button'
					? { role: 'button' }
					: {} ),
			} );
			const innerProps = wp.blockEditor.useInnerBlocksProps.save(
				attributes.href ? {} : props
			);
			return el(
				attributes.tagName === 'button' ? 'div' : attributes.tagName,
				attributes.href ? props : innerProps,
				attributes.href
					? el(
							'div',
							{ 'data-unitone-layout': 'decorator__inner' },
							el( 'div', innerProps ),
							el(
								'a',
								{
									'data-unitone-layout': 'decorator__link',
									href: attributes.href,
									target: attributes.linkTarget,
									rel: attributes.rel,
								},
								attributes.linkText ?? 'Learn more'
							)
						)
					: innerProps.children
			);
		},
	} );
}
