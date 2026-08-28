import { describe, expect, it } from 'vitest';
import { runExclusive } from './jobs';

describe('runExclusive', () => {
	it('drops stale results', async () => {
		let resolveFirst: (value: string) => void = () => undefined;
		const first = runExclusive('k', () => new Promise<string>((resolve) => (resolveFirst = resolve)));
		const second = runExclusive('k', async () => 'latest');
		resolveFirst('stale');
		expect(await first).toBeUndefined();
		expect(await second).toBe('latest');
	});
});
