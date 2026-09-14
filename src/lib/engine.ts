export type EngineKind = 'mysql' | 'postgres';

export const ENGINE_PRESETS = {
	mysql: { name: 'MySQL', port: 3306, username: 'root', database: '' },
	postgres: { name: 'PostgreSQL', port: 5432, username: 'postgres', database: 'postgres' }
} as const;

export function normalizeEngine(value: string | undefined | null): EngineKind {
	const engine = (value ?? 'mysql').trim().toLowerCase();
	if (engine === 'postgres' || engine === 'postgresql' || engine === 'pgsql') return 'postgres';
	return 'mysql';
}

export function engineLabel(value: string | undefined | null): string {
	return normalizeEngine(value) === 'postgres' ? 'PostgreSQL' : 'MySQL';
}

export function isPostgres(value: string | undefined | null): boolean {
	return normalizeEngine(value) === 'postgres';
}

export function schemaNoun(value: string | undefined | null): 'Schema' | 'Database' {
	return isPostgres(value) ? 'Schema' : 'Database';
}

export function quoteIdent(engine: string | undefined | null, name: string): string {
	if (isPostgres(engine)) return `"${name.replaceAll('"', '""')}"`;
	return `\`${name.replaceAll('`', '``')}\``;
}

export function quoteLiteral(value: string | null): string {
	if (value == null) return 'NULL';
	return `'${value.replaceAll("'", "''")}'`;
}

export function qualifyIdent(engine: string | undefined | null, schema: string, name?: string): string {
	const prefix = quoteIdent(engine, schema);
	return name ? `${prefix}.${quoteIdent(engine, name)}` : `${prefix}.`;
}
