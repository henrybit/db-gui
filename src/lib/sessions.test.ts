import { describe, expect, it } from 'vitest';
import { MAX_OPEN_SESSIONS, connectStatus, forgetExpandedKeys, idsToEvict } from './sessions';

describe('idsToEvict', () => {
	it('keeps existing sessions under the cap', () => {
		expect(idsToEvict(['a', 'b'], 'c')).toEqual([]);
	});

	it('does not evict when reconnecting an open session', () => {
		expect(idsToEvict(['a', 'b', 'c', 'd', 'e'], 'c')).toEqual([]);
	});

	it('closes the oldest session when opening a sixth', () => {
		expect(idsToEvict(['a', 'b', 'c', 'd', 'e'], 'f')).toEqual(['a']);
	});

	it('closes multiple oldest sessions after overflow', () => {
		expect(idsToEvict(['a', 'b', 'c', 'd', 'e', 'f'], 'g')).toEqual(['a', 'b']);
	});

	it('uses MAX_OPEN_SESSIONS as the default cap', () => {
		expect(MAX_OPEN_SESSIONS).toBe(5);
		expect(idsToEvict(Array.from({ length: MAX_OPEN_SESSIONS }, (_, i) => String(i)), 'x')).toEqual([
			'0'
		]);
	});
});

describe('forgetExpandedKeys', () => {
	it('drops tree keys that belong to a closed connection', () => {
		const next = forgetExpandedKeys(
			['conn:a', 'conn:b', 'db:a:shop', 'folder:a:shop:tables', 'db:b:public'],
			'a'
		);
		expect([...next]).toEqual(['conn:b', 'db:b:public']);
	});
});

describe('connectStatus', () => {
	it('mentions closed connections when a slot was reused', () => {
		expect(connectStatus([])).toBe('Connected');
		expect(connectStatus(['Prod'])).toBe('Connected · closed Prod (max 5 sessions)');
	});
});
