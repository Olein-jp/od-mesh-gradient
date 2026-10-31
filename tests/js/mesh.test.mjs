import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {test} from 'node:test';
const source = readFileSync(new URL('../../src/utils/mesh.js', import.meta.url), 'utf8');
const {valid, generateCSS, defaultMesh, presets, candidate} = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
test('5 種類のプリセットを検証し順序どおり CSS を生成する', () => {
 assert.equal(presets.length, 5);
 for (const {value} of presets) {assert.ok(valid(value)); assert.ok(generateCSS(value).startsWith('radial-gradient(circle at 20% 20%,rgba(')); assert.ok(generateCSS(value).endsWith(`linear-gradient(${value.baseColor},${value.baseColor})`));}
});
test('不正な値と過大な構造を拒否する', () => {
 for (const bad of [null, {}, [], 'x', {...defaultMesh(), version: 2}, {...defaultMesh(), enabled: 1}, {...defaultMesh(), baseColor: '#fff'}, {...defaultMesh(), extra: 'x'}, {...defaultMesh(), points: Array(9).fill(defaultMesh().points[0])}]) assert.equal(valid(bad), false);
 for (const [key, bad] of [['x', -1], ['y', 101], ['size', 151], ['size', 9], ['opacity', 101], ['opacity', '10'], ['color', '#ffffff;evil'], ['x', Infinity], ['id', 'bad id'], ['id', 'point-1\n'], ['color', '#ffffff\n']]) {const mesh = defaultMesh(); mesh.points[0][key] = bad; assert.equal(valid(mesh), false); assert.equal(generateCSS(mesh), '');}
 const mesh = defaultMesh(); mesh.points[1].id = mesh.points[0].id; assert.equal(valid(mesh), false);
});
test('境界値と無効化を扱う', () => {const mesh = defaultMesh(); Object.assign(mesh.points[0], {x: 0, y: 100, size: 150, opacity: 0}); assert.ok(valid(mesh)); assert.ok(generateCSS(mesh).includes('150%)')); mesh.enabled = false; assert.equal(generateCSS(mesh), '');});
test('PHP と JS の supports 不一致を拒否し明示的な追加を許可する', () => {assert.ok(candidate({supported:true, declared:true}, {background:{gradient:true}})); assert.ok(candidate({supported:true, declared:true}, {color:{gradients:true}})); assert.equal(candidate({supported:true, declared:true}, {}), false); assert.ok(candidate({supported:true, override:true}, {})); assert.equal(candidate({supported:false, override:true}, {}), false);});
