import { localeTag } from '$lib/i18n/i18n.svelte';

export function formatBytes(bytes?: number | null): string {
	if (bytes == null) return '—';
	if (bytes < 1024) return `${bytes} B`;
	const units = ['KB', 'MB', 'GB', 'TB'];
	let value = bytes / 1024;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit += 1;
	}
	const digits = value >= 10 || Number.isInteger(Number(value.toFixed(1))) ? 0 : 1;
	return `${value.toFixed(digits)} ${units[unit]}`;
}

export function formatNumber(value?: number | null): string {
	if (value == null) return '—';
	return new Intl.NumberFormat(localeTag()).format(value);
}

export function formatDuration(ms: number): string {
	if (ms < 1000) return `${ms} ms`;
	return `${(ms / 1000).toFixed(2)} s`;
}

let counter = 0;
export function uid(prefix = 'id'): string {
	counter += 1;
	return `${prefix}-${Date.now().toString(36)}-${counter}`;
}
