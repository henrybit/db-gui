import { api, isTauriRuntime } from '$lib/api/tauri';
import { downloadTextFile } from '$lib/download';

export function sqlDumpFileName(base: string, suffix = ''): string {
	const safe = base.trim().replace(/[\\/:*?"<>|]+/g, '_') || 'export';
	return `${safe}${suffix}.sql`;
}

export async function pickSqlSavePath(
	defaultFileName: string,
	title = 'Export SQL'
): Promise<string | null> {
	if (!isTauriRuntime()) return defaultFileName;
	const { save } = await import('@tauri-apps/plugin-dialog');
	const selected = await save({
		title,
		defaultPath: defaultFileName,
		filters: [{ name: 'SQL', extensions: ['sql'] }]
	});
	return selected ?? null;
}

export async function writeSqlFile(
	path: string,
	content: string,
	fallbackName: string
): Promise<string> {
	if (!isTauriRuntime()) {
		downloadTextFile(fallbackName, content);
		return fallbackName;
	}
	return api.writeTextFile(path, content);
}
