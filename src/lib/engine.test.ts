import { describe, expect, it } from 'vitest';
import {
	engineLabel,
	normalizeEngine,
	qualifyIdent,
	quoteIdent,
	quoteLiteral,
	schemaNoun
} from './engine';

describe('engine helpers', () => {
	it('normalizes engine aliases', () => {
		expect(normalizeEngine('PostgreSQL')).toBe('postgres');
		expect(normalizeEngine('pgsql')).toBe('postgres');
		expect(normalizeEngine('mysql')).toBe('mysql');
		expect(engineLabel('postgres')).toBe('PostgreSQL');
		expect(schemaNoun('mysql')).toBe('Database');
		expect(schemaNoun('pgsql')).toBe('Schema');
	});

	it('quotes identifiers per dialect', () => {
		expect(quoteIdent('mysql', 'a`b')).toBe('`a``b`');
		expect(quoteIdent('postgres', 'a"b')).toBe('"a""b"');
		expect(qualifyIdent('postgres', 'public', 'users')).toBe('"public"."users"');
		expect(qualifyIdent('mysql', 'shop')).toBe('`shop`.');
	});

	it('quotes SQL literals', () => {
		expect(quoteLiteral(null)).toBe('NULL');
		expect(quoteLiteral("O'Brien")).toBe("'O''Brien'");
	});
});
