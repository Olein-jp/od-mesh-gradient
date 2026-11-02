const { test, expect } = require( '@playwright/test' );

// 新規環境の案内ダイアログと、サイドバーの描画タイミングを揃える。
async function openMeshPanel( page ) {
	await page.evaluate( () =>
		wp.data
			.dispatch( 'core/preferences' )
			.set( 'core/edit-post', 'welcomeGuide', false )
	);
	const styles = page.getByRole( 'tab', { name: /スタイル|Styles/ } );
	const panel = page.getByRole( 'button', {
		name: 'メッシュグラデーション',
		exact: true,
	} );
	await expect
		.poll(
			async () =>
				( await styles.isVisible() ) || ( await panel.isVisible() )
		)
		.toBe( true );
	if ( await styles.isVisible() ) await styles.click();
	await panel.click();
}
test( 'GUI 編集・保存・再読込・公開表示・無効化・Undo/Redo', async ( {
	page,
} ) => {
	const errors = [];
	page.on( 'pageerror', ( e ) => errors.push( e.message ) );
	await page.goto( '/wp-login.php' );
	await page.locator( '#user_login' ).fill( 'admin' );
	await page.locator( '#user_pass' ).fill( 'password' );
	await page.locator( '#wp-submit' ).click();
	await page.goto( '/wp-admin/post-new.php' );
	await page.waitForFunction( () =>
		Boolean( window.wp?.data?.select( 'core/block-editor' ) )
	);
	await page.evaluate( () => {
		wp.data.dispatch( 'core/edit-post' ).toggleFeature &&
			wp.data
				.select( 'core/edit-post' )
				.isFeatureActive( 'welcomeGuide' ) &&
			wp.data
				.dispatch( 'core/edit-post' )
				.toggleFeature( 'welcomeGuide' );
		const group = wp.blocks.createBlock(
			'core/group',
			{ style: { color: { background: '#123456' } } },
			[
				wp.blocks.createBlock( 'core/paragraph', {
					content: 'メッシュ動作テスト',
				} ),
			]
		);
		wp.data.dispatch( 'core/block-editor' ).resetBlocks( [ group ] );
		wp.data
			.dispatch( 'core/editor' )
			.editPost( { title: 'Mesh E2E', status: 'draft' } );
		wp.data.dispatch( 'core/block-editor' ).selectBlock( group.clientId );
	} );
	const styles = page.getByRole( 'tab', { name: /スタイル|Styles/ } );
	if ( await styles.count() ) await styles.click();
	await page
		.getByRole( 'button', { name: 'メッシュグラデーション', exact: true } )
		.click();
	await page
		.getByRole( 'checkbox', { name: 'メッシュグラデーションを使用' } )
		.check();
	const preset = page.getByRole( 'combobox', {
		name: 'プリセット',
		exact: true,
	} );
	await expect( preset ).toHaveValue( '0' );
	await expect( preset.locator( 'option:checked' ) ).toHaveText(
		'Soft Pastel'
	);
	const editor = page.frameLocator( 'iframe[name="editor-canvas"]' );
	const root = editor.locator( '[data-type="core/group"]' ).first();
	await expect( root ).toHaveCSS( 'background-image', /radial-gradient/ );
	await page
		.getByRole( 'spinbutton', { name: 'X 座標 (%)', exact: true } )
		.fill( '35' );
	await expect( preset ).toHaveValue( '' );
	await expect( preset.locator( 'option:checked' ) ).toHaveText( 'カスタム' );
	await page
		.getByRole( 'spinbutton', { name: '広がり (%)', exact: true } )
		.fill( '120' );
	await page
		.getByRole( 'spinbutton', { name: '透明度 (%)', exact: true } )
		.fill( '60' );
	const pointColors = page.locator( '.components-base-control' ).filter( {
		has: page.getByText( 'ポイントの色', { exact: true } ),
	} );
	const swatch = pointColors.getByRole( 'option' ).first();
	await swatch.click();
	await expect( page.locator( '.od-mesh-handle' ).first() ).toHaveCSS(
		'background-color',
		await swatch.evaluate(
			( element ) => getComputedStyle( element ).backgroundColor
		)
	);
	await pointColors
		.locator( '.components-color-palette__custom-color-button' )
		.click();
	await page
		.getByRole( 'textbox', { name: 'Hex color', exact: true } )
		.fill( 'ff8800' );
	await page
		.getByRole( 'textbox', { name: 'Hex color', exact: true } )
		.press( 'Tab' );
	expect(
		await page.evaluate(
			() =>
				wp.data.select( 'core/block-editor' ).getBlocks()[ 0 ]
					.attributes.odMeshGradient.points[ 0 ].color
		)
	).toBe( '#ff8800' );
	await page.keyboard.press( 'Escape' );
	await page
		.getByRole( 'button', { name: 'ポイント追加', exact: true } )
		.click();
	await expect( page.locator( '.od-mesh-handle' ) ).toHaveCount( 4 );
	await page.locator( '.od-mesh-handle' ).last().focus();
	await page.keyboard.press( 'ArrowRight' );
	await page
		.getByRole( 'button', { name: 'ポイント削除', exact: true } )
		.click();
	await expect( page.locator( '.od-mesh-handle' ) ).toHaveCount( 3 );
	const handle = page.locator( '.od-mesh-handle' ).first();
	const box = await handle.boundingBox();
	await page.mouse.move( box.x + 14, box.y + 14 );
	await page.mouse.down();
	await page.mouse.move( box.x + 45, box.y + 35, { steps: 4 } );
	await page.mouse.up();
	await page
		.getByRole( 'combobox', { name: 'プリセット', exact: true } )
		.selectOption( '1' );
	await expect( preset ).toHaveValue( '1' );
	await expect( preset.locator( 'option:checked' ) ).toHaveText(
		'Ocean Breeze'
	);
	await page.screenshot( {
		path: '/tmp/od-mesh-editor.png',
		fullPage: true,
	} );
	await page.evaluate( async () => {
		await wp.data.dispatch( 'core/editor' ).savePost();
	} );
	const postId = await page.evaluate( () =>
		wp.data.select( 'core/editor' ).getCurrentPostId()
	);
	const saved = await page.evaluate(
		() => wp.data.select( 'core/block-editor' ).getBlocks()[ 0 ].attributes
	);
	expect( saved.odMeshGradient.baseColor ).toBe( '#d8f3fa' );
	expect( saved.style.color.background ).toBe( '#123456' );
	await page.reload();
	await page.waitForFunction(
		() => wp.data.select( 'core/block-editor' ).getBlocks().length > 0
	);
	expect(
		await page.evaluate(
			() => wp.data.select( 'core/block-editor' ).getBlocks()[ 0 ].isValid
		)
	).toBe( true );
	await expect( root ).toHaveCSS( 'background-image', /radial-gradient/ );
	await page.evaluate( () =>
		wp.data
			.dispatch( 'core/block-editor' )
			.selectBlock(
				wp.data.select( 'core/block-editor' ).getBlocks()[ 0 ].clientId
			)
	);
	if ( await styles.count() ) await styles.click();
	await page
		.getByRole( 'button', { name: 'メッシュグラデーション', exact: true } )
		.click();
	await expect( preset ).toHaveValue( '1' );
	await expect( preset.locator( 'option:checked' ) ).toHaveText(
		'Ocean Breeze'
	);
	await page
		.getByRole( 'spinbutton', { name: 'X 座標 (%)', exact: true } )
		.fill( '40' );
	await expect( preset ).toHaveValue( '' );
	await page.evaluate( () => wp.data.dispatch( 'core/editor' ).undo() );
	await expect( preset ).toHaveValue( '1' );
	await page.evaluate( () => wp.data.dispatch( 'core/editor' ).redo() );
	await expect( preset ).toHaveValue( '' );
	await page.evaluate( () => wp.data.dispatch( 'core/editor' ).undo() );
	await expect( preset ).toHaveValue( '1' );
	const frontend = await page.context().newPage();
	await frontend.goto( `/?p=${ postId }&preview=true` );
	await expect(
		frontend
			.locator( '.wp-block-group' )
			.filter( { hasText: 'メッシュ動作テスト' } )
			.last()
	).toHaveCSS( 'background-image', /radial-gradient/ );
	await frontend.close();
	await page.evaluate( () => {
		const b = wp.data.select( 'core/block-editor' ).getBlocks()[ 0 ];
		wp.data
			.dispatch( 'core/block-editor' )
			.updateBlockAttributes( b.clientId, {
				odMeshGradient: {
					...b.attributes.odMeshGradient,
					enabled: false,
				},
			} );
	} );
	await expect( root ).not.toHaveCSS( 'background-image', /radial-gradient/ );
	await page.evaluate( () => wp.data.dispatch( 'core/editor' ).undo() );
	await expect( root ).toHaveCSS( 'background-image', /radial-gradient/ );
	await page.evaluate( () => wp.data.dispatch( 'core/editor' ).redo() );
	await expect( root ).not.toHaveCSS( 'background-image', /radial-gradient/ );
	await expect( root ).toHaveCSS( 'background-color', 'rgb(18, 52, 86)' );
	await page.evaluate( async () => {
		await wp.data.dispatch( 'core/editor' ).savePost();
	} );
	expect( errors ).toEqual( [] );
} );

test( 'コアと拡張ブロックの候補判定・アダプター・保存互換性', async ( {
	page,
} ) => {
	const errors = [];
	page.on( 'pageerror', ( e ) => errors.push( e.message ) );
	await page.goto( '/wp-login.php' );
	await page.locator( '#user_login' ).fill( 'admin' );
	await page.locator( '#user_pass' ).fill( 'password' );
	await page.locator( '#wp-submit' ).click();
	await page.goto( '/wp-admin/post-new.php' );
	await page.waitForFunction( () =>
		Boolean( window.wp?.blocks?.getBlockType( 'od-mesh-fixture/color' ) )
	);
	await expect(
		page
			.frameLocator( 'iframe[name="editor-canvas"]' )
			.locator( '.block-editor-block-list__layout' )
			.first()
	).toBeVisible();
	const results = await page.evaluate( async () => {
		const mesh = {
			version: 1,
			enabled: true,
			baseColor: '#e7e4f6',
			points: [
				{
					id: 'a',
					color: '#6476d9',
					x: 20,
					y: 20,
					size: 65,
					opacity: 80,
				},
				{
					id: 'b',
					color: '#e6a2d4',
					x: 80,
					y: 25,
					size: 65,
					opacity: 80,
				},
			],
		};
		const names = [
			'core/group',
			'core/paragraph',
			'core/heading',
			'core/columns',
			'core/column',
			'core/quote',
			'core/pullquote',
			'core/verse',
			'od-mesh-fixture/color',
			'od-mesh-fixture/background',
			'od-mesh-fixture/custom',
			'od-mesh-fixture/forced',
			'od-mesh-fixture/disabled',
			'od-mesh-fixture/plain',
			'od-mesh-fixture/conflict',
		];
		const out = [];
		for ( const name of names ) {
			const attrs = {};
			if ( ! name.endsWith( '/conflict' ) ) attrs.odMeshGradient = mesh;
			if (
				name === 'core/paragraph' ||
				name === 'core/heading' ||
				name === 'core/verse'
			)
				attrs.content = '互換テスト本文';
			const b = wp.blocks.createBlock( name, attrs );
			const html = wp.blocks.serialize( [ b ] );
			const parsed = wp.blocks.parse( html )[ 0 ];
			out.push( {
				name,
				valid: parsed.isValid,
				supported: window.odMeshGradientConfig[ name ]?.supported,
				compatible: Boolean(
					window.odMeshGradientConfig[ name ]?.adapter
				),
			} );
		}
		const blocks = names.slice( 0, -3 ).map( ( name ) =>
			wp.blocks.createBlock( name, {
				odMeshGradient: mesh,
				...( [
					'core/paragraph',
					'core/heading',
					'core/verse',
				].includes( name )
					? { content: '互換テスト本文' }
					: {} ),
			} )
		);
		wp.data.dispatch( 'core/block-editor' ).resetBlocks( blocks );
		wp.data
			.dispatch( 'core/editor' )
			.editPost( { title: 'Mesh compatibility', status: 'draft' } );
		await wp.data.dispatch( 'core/editor' ).savePost();
		return { out, id: wp.data.select( 'core/editor' ).getCurrentPostId() };
	} );
	for ( const item of results.out ) {
		expect( item.valid, item.name ).toBe( true );
		if (
			item.name.endsWith( '/plain' ) ||
			item.name.endsWith( '/conflict' )
		)
			expect( item.supported ).toBe( false );
		else expect( item.supported, item.name ).toBe( true );
	}
	expect(
		results.out.find( ( item ) => item.name.endsWith( '/disabled' ) )
			.compatible
	).toBe( false );
	await page.reload();
	await page.waitForFunction(
		() =>
			window.wp?.data?.select( 'core/block-editor' ).getBlocks()
				.length === 12
	);
	const frame = page.frameLocator( 'iframe[name="editor-canvas"]' );
	for ( const name of [
		'core/group',
		'core/paragraph',
		'core/heading',
		'core/columns',
		'core/column',
		'core/quote',
		'core/pullquote',
		'core/verse',
		'od-mesh-fixture/color',
		'od-mesh-fixture/background',
		'od-mesh-fixture/forced',
	] )
		await expect(
			frame.locator( `[data-type="${ name }"]` ).first()
		).toHaveCSS( 'background-image', /radial-gradient/ );
	await expect( frame.locator( '.fixture-custom' ) ).toHaveCSS(
		'background-image',
		/radial-gradient/
	);
	await page.goto( `/?p=${ results.id }&preview=true` );
	for ( const selector of [
		'.wp-block-group',
		'p.wp-block-paragraph',
		'h2.wp-block-heading',
		'.wp-block-columns',
		'.wp-block-column',
		'.wp-block-quote',
		'.wp-block-pullquote',
		'.wp-block-verse',
		'.fixture-color',
		'.fixture-background',
		'.fixture-custom',
		'.fixture-forced',
	] ) {
		const target = page
			.locator( '.wp-block-post-content' )
			.last()
			.locator( selector )
			.first();
		if ( selector === 'p.wp-block-paragraph' && ! ( await target.count() ) )
			await expect(
				page
					.locator( 'p' )
					.filter( { hasText: '互換テスト本文' } )
					.first()
			).toHaveCSS( 'background-image', /radial-gradient/ );
		else
			await expect( target, selector ).toHaveCSS(
				'background-image',
				/radial-gradient/
			);
	}
	expect( errors ).toEqual( [] );
} );

test( 'unitone セクションの警告解消・可変タグ・入れ子・保存と背景復元', async ( {
	page,
} ) => {
	const errors = [];
	page.on( 'pageerror', ( e ) => errors.push( e.message ) );
	await page.goto( '/wp-login.php' );
	await page.locator( '#user_login' ).fill( 'admin' );
	await page.locator( '#user_pass' ).fill( 'password' );
	await page.locator( '#wp-submit' ).click();
	await page.goto( '/wp-admin/post-new.php' );
	const frame = page.frameLocator( 'iframe[name="editor-canvas"]' );
	await expect(
		frame.locator( '.block-editor-block-list__layout' ).first()
	).toBeVisible();
	await page.waitForFunction( () =>
		Boolean( window.wp?.blocks?.getBlockType( 'unitone/section' ) )
	);
	await page.evaluate( () => {
		const make = ( tagName, text, inner = [] ) =>
			wp.blocks.createBlock(
				'unitone/section',
				{ tagName, style: { color: { background: '#123456' } } },
				[
					wp.blocks.createBlock( 'core/paragraph', {
						content: text,
					} ),
					...inner,
				]
			);
		const blocks = [
			'main',
			'section',
			'article',
			'aside',
			'header',
			'footer',
			'div',
		].map( ( tag ) =>
			make(
				tag,
				`unitone 検証 ${ tag }`,
				tag === 'section' ? [ make( 'section', '内側セクション' ) ] : []
			)
		);
		wp.data.dispatch( 'core/block-editor' ).resetBlocks( blocks );
		wp.data
			.dispatch( 'core/editor' )
			.editPost( { title: 'unitone section adapter', status: 'draft' } );
		wp.data
			.dispatch( 'core/block-editor' )
			.selectBlock( blocks[ 1 ].clientId );
	} );
	await openMeshPanel( page );
	await expect(
		page.getByText(
			'このブロックは描画互換性が未確認です。対応アダプターを登録するまで背景を適用しません。',
			{ exact: true }
		)
	).toHaveCount( 0 );
	await page
		.getByRole( 'checkbox', {
			name: 'メッシュグラデーションを使用',
			exact: true,
		} )
		.check();
	await expect(
		frame.locator( '[data-type="unitone/section"]' ).nth( 1 )
	).toHaveCSS( 'background-image', /radial-gradient/ );
	await expect(
		frame.locator( '[data-type="unitone/section"]' ).nth( 2 )
	).not.toHaveCSS( 'background-image', /radial-gradient/ );
	await page.evaluate( async () => {
		const blocks = wp.data.select( 'core/block-editor' ).getBlocks();
		const mesh = blocks[ 1 ].attributes.odMeshGradient;
		for ( const b of blocks )
			wp.data
				.dispatch( 'core/block-editor' )
				.updateBlockAttributes( b.clientId, { odMeshGradient: mesh } );
		await wp.data.dispatch( 'core/editor' ).savePost();
	} );
	const id = await page.evaluate( () =>
		wp.data.select( 'core/editor' ).getCurrentPostId()
	);
	await page.reload();
	await page.waitForFunction(
		() =>
			window.wp?.data?.select( 'core/block-editor' ).getBlocks()
				.length === 7
	);
	expect(
		await page.evaluate( () =>
			wp.data
				.select( 'core/block-editor' )
				.getBlocks()
				.every(
					( b ) =>
						b.isValid &&
						b.innerBlocks.every( ( inner ) => inner.isValid )
				)
		)
	).toBe( true );
	for ( const tag of [
		'main',
		'section',
		'article',
		'aside',
		'header',
		'footer',
		'div',
	] )
		await expect(
			frame.locator( `${ tag }[data-type="unitone/section"]` ).first()
		).toHaveCSS( 'background-image', /radial-gradient/ );
	const frontend = await page.context().newPage();
	await frontend.goto( `/?p=${ id }&preview=true` );
	for ( const tag of [
		'main',
		'section',
		'article',
		'aside',
		'header',
		'footer',
		'div',
	] )
		await expect(
			frontend.locator( `${ tag }.unitone-section` ).first()
		).toHaveCSS( 'background-image', /radial-gradient/ );
	await expect(
		frontend.locator( 'section.unitone-section section.unitone-section' )
	).not.toHaveCSS( 'background-image', /radial-gradient/ );
	await page.evaluate( async () => {
		for ( const b of wp.data.select( 'core/block-editor' ).getBlocks() )
			wp.data
				.dispatch( 'core/block-editor' )
				.updateBlockAttributes( b.clientId, {
					odMeshGradient: {
						...b.attributes.odMeshGradient,
						enabled: false,
					},
				} );
		await wp.data.dispatch( 'core/editor' ).savePost();
	} );
	await frontend.reload();
	await expect(
		frontend.locator( 'div.unitone-section' ).first()
	).not.toHaveCSS( 'background-image', /radial-gradient/ );
	await expect( frontend.locator( 'div.unitone-section' ).first() ).toHaveCSS(
		'background-color',
		'rgb(18, 52, 86)'
	);
	await frontend.close();
	expect( errors ).toEqual( [] );
} );

test( 'unitone デコレーターのリンク・ボタン・入れ子・背景復元', async ( {
	page,
} ) => {
	const errors = [];
	page.on( 'pageerror', ( e ) => errors.push( e.message ) );
	await page.goto( '/wp-login.php' );
	await page.locator( '#user_login' ).fill( 'admin' );
	await page.locator( '#user_pass' ).fill( 'password' );
	await page.locator( '#wp-submit' ).click();
	await page.goto( '/wp-admin/post-new.php' );
	const frame = page.frameLocator( 'iframe[name="editor-canvas"]' );
	await expect(
		frame.locator( '.block-editor-block-list__layout' ).first()
	).toBeVisible();
	await page.waitForFunction( () =>
		Boolean( window.wp?.blocks?.getBlockType( 'unitone/decorator' ) )
	);
	await page.evaluate( () => {
		const make = ( attributes, text, inner = [] ) =>
			wp.blocks.createBlock(
				'unitone/decorator',
				{ style: { color: { background: '#123456' } }, ...attributes },
				[
					wp.blocks.createBlock( 'core/paragraph', {
						content: text,
					} ),
					...inner,
				]
			);
		const blocks = [
			make( { tagName: 'div' }, 'デコレーター本文', [
				make( { tagName: 'div' }, '子デコレーター' ),
			] ),
			make(
				{
					tagName: 'article',
					href: '/details',
					linkText: '詳細を見る',
					linkTarget: '_blank',
					rel: 'noopener noreferrer',
				},
				'リンク付き本文'
			),
			make( { tagName: 'button' }, 'ボタン本文' ),
			make(
				{
					tagName: 'button',
					href: '/button-details',
					linkText: 'ボタン詳細',
				},
				'リンク付きボタン本文'
			),
		];
		wp.data.dispatch( 'core/block-editor' ).resetBlocks( blocks );
		wp.data.dispatch( 'core/editor' ).editPost( {
			title: 'unitone decorator adapter',
			status: 'draft',
		} );
		wp.data
			.dispatch( 'core/block-editor' )
			.selectBlock( blocks[ 0 ].clientId );
	} );
	await openMeshPanel( page );
	await expect(
		page.getByText(
			'このブロックは描画互換性が未確認です。対応アダプターを登録するまで背景を適用しません。',
			{ exact: true }
		)
	).toHaveCount( 0 );
	await page
		.getByRole( 'checkbox', {
			name: 'メッシュグラデーションを使用',
			exact: true,
		} )
		.check();
	await expect(
		frame.locator( '[data-type="unitone/decorator"]' ).first()
	).toHaveCSS( 'background-image', /radial-gradient/ );
	await expect(
		frame.locator( '[data-type="unitone/decorator"]' ).nth( 1 )
	).not.toHaveCSS( 'background-image', /radial-gradient/ );
	await page.evaluate( async () => {
		const blocks = wp.data.select( 'core/block-editor' ).getBlocks();
		const mesh = blocks[ 0 ].attributes.odMeshGradient;
		for ( const b of blocks )
			wp.data
				.dispatch( 'core/block-editor' )
				.updateBlockAttributes( b.clientId, { odMeshGradient: mesh } );
		await wp.data.dispatch( 'core/editor' ).savePost();
	} );
	const postId = await page.evaluate( () =>
		wp.data.select( 'core/editor' ).getCurrentPostId()
	);
	await page.reload();
	await page.waitForFunction(
		() =>
			window.wp?.data?.select( 'core/block-editor' ).getBlocks()
				.length === 4
	);
	const blocks = await page.evaluate( () =>
		wp.data
			.select( 'core/block-editor' )
			.getBlocks()
			.map( ( b ) => ( {
				id: b.clientId,
				valid: b.isValid,
				href: b.attributes.href,
				rel: b.attributes.rel,
				linkTarget: b.attributes.linkTarget,
				tagName: b.attributes.tagName,
				innerValid: b.innerBlocks.every( ( inner ) => inner.isValid ),
			} ) )
	);
	for ( const b of blocks ) {
		expect( b.valid && b.innerValid ).toBe( true );
		await expect( frame.locator( `[data-block="${ b.id }"]` ) ).toHaveCSS(
			'background-image',
			/radial-gradient/
		);
	}
	expect( blocks[ 1 ] ).toMatchObject( {
		href: '/details',
		rel: 'noopener noreferrer',
		linkTarget: '_blank',
		tagName: 'article',
	} );
	expect( blocks[ 2 ].tagName ).toBe( 'button' );
	const frontend = await page.context().newPage();
	await frontend.goto( `/?p=${ postId }&preview=true` );
	const container = frontend.locator( '.wp-block-post-content' ).last();
	await expect(
		container.locator( 'div[data-unitone-layout~="decorator"]' ).first()
	).toHaveCSS( 'background-image', /radial-gradient/ );
	await expect(
		container.locator(
			'[data-unitone-layout~="decorator"] [data-unitone-layout~="decorator"]'
		)
	).not.toHaveCSS( 'background-image', /radial-gradient/ );
	const linked = container.locator(
		'article[data-unitone-layout~="decorator"]'
	);
	await expect( linked ).toHaveCSS( 'background-image', /radial-gradient/ );
	await expect(
		linked.locator( '[data-unitone-layout="decorator__inner"]' )
	).not.toHaveCSS( 'background-image', /radial-gradient/ );
	const link = linked.locator( 'a' );
	await expect( link ).toHaveAttribute( 'href', '/details' );
	await expect( link ).toHaveAttribute( 'target', '_blank' );
	await expect( link ).toHaveAttribute( 'rel', 'noopener noreferrer' );
	await expect( link ).toHaveText( '詳細を見る' );
	const buttons = container.locator(
		'[data-unitone-layout~="decorator"][role="button"]'
	);
	await expect( buttons ).toHaveCount( 2 );
	for ( let index = 0; index < 2; index++ )
		await expect( buttons.nth( index ) ).toHaveCSS(
			'background-image',
			/radial-gradient/
		);
	await page.evaluate( async () => {
		for ( const b of wp.data.select( 'core/block-editor' ).getBlocks() )
			wp.data
				.dispatch( 'core/block-editor' )
				.updateBlockAttributes( b.clientId, {
					odMeshGradient: {
						...b.attributes.odMeshGradient,
						enabled: false,
					},
				} );
		await wp.data.dispatch( 'core/editor' ).savePost();
	} );
	await frontend.reload();
	await expect( linked ).not.toHaveCSS(
		'background-image',
		/radial-gradient/
	);
	await expect( linked ).toHaveCSS( 'background-color', 'rgb(18, 52, 86)' );
	await expect( linked.locator( 'a' ) ).toHaveAttribute( 'href', '/details' );
	await expect( buttons ).toHaveCount( 2 );
	await frontend.close();
	expect( errors ).toEqual( [] );
} );
