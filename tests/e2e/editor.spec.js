const { test, expect } = require( '@playwright/test' );
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
	const editor = page.frameLocator( 'iframe[name="editor-canvas"]' );
	const root = editor.locator( '[data-type="core/group"]' ).first();
	await expect( root ).toHaveCSS( 'background-image', /radial-gradient/ );
	await page
		.getByRole( 'spinbutton', { name: 'X 座標 (%)', exact: true } )
		.fill( '35' );
	await page
		.getByRole( 'spinbutton', { name: '広がり (%)', exact: true } )
		.fill( '120' );
	await page
		.getByRole( 'spinbutton', { name: '透明度 (%)', exact: true } )
		.fill( '60' );
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
