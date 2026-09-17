import { describe, expect, it } from 'vitest';
import { sqlDumpFileName } from './save-sql-file';

describe('sqlDumpFileName', () => {
	it('keeps simple identifiers', () => {
		expect(sqlDumpFileName('shop')).toBe('shop.sql');
		expect(sqlDumpFileName('orders', '_data')).toBe('orders_data.sql');
	});

	it('replaces path characters', () => {
		expect(sqlDumpFileName('a/b:c', '_data')).toBe('a_b_c_data.sql');
	});
});
