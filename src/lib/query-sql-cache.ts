import { api, isTauriRuntime } from '$lib/api/tauri';

export const QUERY_SQL_MEMORY_LIMIT = 1024 * 1024;

const memoryFallback = new Map<string, string>();

export function querySqlByteLength(sql: string): number {
	if (sql.length > QUERY_SQL_MEMORY_LIMIT) return QUERY_SQL_MEMORY_LIMIT + 1;
	if (sql.length * 3 <= QUERY_SQL_MEMORY_LIMIT) return sql.length;
	return new TextEncoder().encode(sql).byteLength;
}

export function exceedsQuerySqlMemoryLimit(sql: string): boolean {
	return querySqlByteLength(sql) > QUERY_SQL_MEMORY_LIMIT;
}

export async function writeQuerySqlCache(tabId: string, sql: string): Promise<void> {
	if (!isTauriRuntime()) {
		memoryFallback.set(tabId, sql);
		return;
	}
	await api.writeQueryCache(tabId, sql);
}

export async function readQuerySqlCache(tabId: string): Promise<string> {
	if (!isTauriRuntime()) {
		return memoryFallback.get(tabId) ?? '';
	}
	return api.readQueryCache(tabId);
}

export async function deleteQuerySqlCache(tabId: string): Promise<void> {
	if (!isTauriRuntime()) {
		memoryFallback.delete(tabId);
		return;
	}
	await api.deleteQueryCache(tabId);
}
