import { addFilter } from '@wordpress/hooks';
import { getBlockType } from '@wordpress/blocks';
import { InspectorControls } from '@wordpress/block-editor';
import { createHigherOrderComponent } from '@wordpress/compose';
import MeshGradientPanel from './components/MeshGradientPanel';
import { candidate, generateCSS } from './utils/mesh';
import './editor.scss';

const config = window.odMeshGradientConfig || {};
const warned = new Set();
const supported = ( name ) => {
	const result = candidate( config[ name ], getBlockType( name )?.supports );
	if ( ! result && config[ name ]?.supported && ! warned.has( name ) ) {
		warned.add( name );
		console.warn(
			'OD Mesh Gradient: supports の不一致によりスキップしました。',
			name
		);
	}
	return result;
};
addFilter(
	'blocks.registerBlockType',
	'od-mesh-gradient/attributes',
	( settings, name ) => {
		if (
			! config[ name ]?.supported ||
			settings.attributes?.odMeshGradient
		)
			return settings;
		return {
			...settings,
			attributes: {
				...settings.attributes,
				odMeshGradient: { type: 'object' },
			},
		};
	}
);
addFilter(
	'editor.BlockEdit',
	'od-mesh-gradient/panel',
	createHigherOrderComponent(
		( BlockEdit ) => ( props ) => (
			<>
				<BlockEdit { ...props } />
				{ props.isSelected && supported( props.name ) && (
					<InspectorControls group="styles">
						<MeshGradientPanel
							value={ props.attributes.odMeshGradient }
							compatible={ Boolean(
								config[ props.name ].adapter
							) }
							onChange={ ( odMeshGradient ) =>
								props.setAttributes( { odMeshGradient } )
							}
						/>
					</InspectorControls>
				) }
			</>
		),
		'withMeshGradientPanel'
	)
);
addFilter(
	'editor.BlockListBlock',
	'od-mesh-gradient/preview',
	createHigherOrderComponent(
		( BlockListBlock ) => ( props ) => {
			const css =
				supported( props.name ) &&
				config[ props.name ].adapter &&
				generateCSS( props.attributes.odMeshGradient );
			const target = config[ props.name ]?.adapter?.selector;
			const selector = `[data-block="${ props.clientId }"]${ target === '&' ? '' : target }`;
			// エディターの既存インライン背景だけを上書きする。公開側は宣言順で優先する。
			return (
				<>
					{ css && (
						<style>{ `${ selector }{background-image:${ css }!important;background-size:100% 100%!important;background-position:0 0!important;background-repeat:no-repeat!important;}` }</style>
					) }
					<BlockListBlock { ...props } />
				</>
			);
		},
		'withMeshGradientPreview'
	)
);
