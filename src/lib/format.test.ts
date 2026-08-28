import { describe, expect, it } from 'vitest';
import { formatBytes, formatDuration, formatNumber } from './format';

describe('format helpers', () => {
	it('formats byte sizes', () => {
		expect(formatBytes(512)).toBe('512 B');
		expect(formatBytes(2048)).toBe('2 KB');
		expect(formatBytes(null)).toBe('—');
	});

	it('formats numbers and durations', () => {
		expect(formatNumber(1200)).toBe('1,200');
		expect(formatDuration(120)).toBe('120 ms');
		expect(formatDuration(2500)).toBe('2.50 s');
	});
});
