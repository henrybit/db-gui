import { describe, expect, it } from 'vitest';
import {
	QUERY_SQL_MEMORY_LIMIT,
	exceedsQuerySqlMemoryLimit,
	querySqlByteLength
} from './query-sql-cache';

describe('query SQL memory limit', () => {
	it('keeps small SQL in memory', () => {
		expect(exceedsQuerySqlMemoryLimit('SELECT 1;')).toBe(false);
		expect(querySqlByteLength('SELECT 1;')).toBe('SELECT 1;'.length);
	});

	it('treats SQL longer than 1MB as over the limit', () => {
		const sql = 'a'.repeat(QUERY_SQL_MEMORY_LIMIT + 1);
		expect(exceedsQuerySqlMemoryLimit(sql)).toBe(true);
	});

	it('counts multi-byte characters toward the limit', () => {
		const sql = '测'.repeat(Math.ceil(QUERY_SQL_MEMORY_LIMIT / 3) + 1);
		expect(querySqlByteLength(sql)).toBeGreaterThan(QUERY_SQL_MEMORY_LIMIT);
		expect(exceedsQuerySqlMemoryLimit(sql)).toBe(true);
	});
});
