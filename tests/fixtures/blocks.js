/* 自動テスト用の静的ブロック。 */
for (const kind of ['color', 'background', 'plain', 'custom', 'forced', 'disabled', 'conflict']) {
 const el = wp.element.createElement;
 const content = () => kind === 'custom' ? el('div', {className:'fixture-custom'}, 'フィクスチャ本文') : 'フィクスチャ本文';
 wp.blocks.registerBlockType(`od-mesh-fixture/${kind}`, {apiVersion:3, title:`Fixture ${kind}`, category:'design',
  supports:kind === 'background' ? {background:{gradient:true}} : {color:{gradients:!['plain','forced'].includes(kind)}},
  edit:()=>el('section',wp.blockEditor.useBlockProps({className:kind === 'custom' ? '' : `fixture-${kind}`}),content()),
  save:()=>el('section',wp.blockEditor.useBlockProps.save({className:kind === 'custom' ? '' : `fixture-${kind}`}),content())});
}
