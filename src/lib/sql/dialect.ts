import { MySQL, PLSQL, PostgreSQL, StandardSQL, type SQLDialect } from '@codemirror/lang-sql';

export type SqlDialectKind = 'mysql' | 'postgres' | 'oracle' | 'standard';

export function normalizeSqlDialect(value: string | undefined | null): SqlDialectKind {
	const engine = (value ?? '').trim().toLowerCase();
	if (engine === 'postgres' || engine === 'postgresql' || engine === 'pgsql') return 'postgres';
	if (engine === 'oracle' || engine === 'oracledb' || engine === 'plsql') return 'oracle';
	if (engine === 'mysql' || engine === 'mariadb') return 'mysql';
	return 'standard';
}

export function sqlDialectFor(engine: string | undefined | null): SQLDialect {
	switch (normalizeSqlDialect(engine)) {
		case 'postgres':
			return PostgreSQL;
		case 'oracle':
			return PLSQL;
		case 'mysql':
			return MySQL;
		default:
			return StandardSQL;
	}
}
