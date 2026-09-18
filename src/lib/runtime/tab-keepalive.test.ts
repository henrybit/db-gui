import { describe, expect, it } from 'vitest';
import { nextMountedTabIds, sameStringSet, shouldRenderMountedTab } from './tab-keepalive';

describe('nextMountedTabIds', () => {
	it('mounts the active tab on first visit', () => {
		const next = nextMountedTabIds(new Set(), new Set(['a', 'b']), 'b');
		expect([...next]).toEqual(['b']);
	});

	it('keeps previously mounted tabs while they stay open', () => {
		const next = nextMountedTabIds(new Set(['a', 'b']), new Set(['a', 'b', 'c']), 'c');
		expect(new Set(next)).toEqual(new Set(['a', 'b', 'c']));
	});

	it('drops closed tabs from the mounted set', () => {
		const next = nextMountedTabIds(new Set(['a', 'b']), new Set(['b']), 'b');
		expect([...next]).toEqual(['b']);
	});

	it('ignores an active id that is not open', () => {
		const next = nextMountedTabIds(new Set(['a']), new Set(['a']), 'missing');
		expect([...next]).toEqual(['a']);
	});
});

describe('shouldRenderMountedTab', () => {
	it('keeps ordinary visited tabs rendered while inactive', () => {
		expect(shouldRenderMountedTab({ kind: 'table' }, false)).toBe(true);
		expect(shouldRenderMountedTab({ kind: 'query' }, false)).toBe(true);
	});

	it('unmounts inactive query tabs whose SQL was spilled to disk', () => {
		expect(shouldRenderMountedTab({ kind: 'query', sqlCached: true }, false)).toBe(false);
		expect(shouldRenderMountedTab({ kind: 'query', sqlCached: true }, true)).toBe(true);
	});
});

describe('sameStringSet', () => {
	it('compares set membership', () => {
		expect(sameStringSet(new Set(['a', 'b']), new Set(['b', 'a']))).toBe(true);
		expect(sameStringSet(new Set(['a']), new Set(['a', 'b']))).toBe(false);
	});
});
