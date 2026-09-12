import type { ColumnInfo } from '$lib/api/types';

export type TemporalKind = 'date' | 'time' | 'datetime';

export function temporalKind(column: ColumnInfo): TemporalKind | null {
	const type = `${column.dataType} ${column.columnType}`.toLowerCase();
	if (/\btimestamp\b/.test(type) || /\bdatetime\b/.test(type)) return 'datetime';
	if (/\bdate\b/.test(type)) return 'date';
	if (/\btime\b/.test(type)) return 'time';
	return null;
}

/** Convert a SQL temporal string into a value accepted by HTML date/time inputs. */
export function toInputValue(kind: TemporalKind | null, sqlValue: string | null | undefined): string {
	if (sqlValue == null || sqlValue === '') return '';
	if (!kind) return sqlValue;
	const value = sqlValue.trim();

	if (kind === 'date') {
		const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
		return match?.[1] ?? value;
	}

	if (kind === 'time') {
		const match = value.match(/(\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)/);
		return match?.[1]?.slice(0, 8) ?? value;
	}

	const match = value.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)/);
	if (!match) return value.replace(' ', 'T');
	const seconds = match[2].length === 5 ? `${match[2]}:00` : match[2].slice(0, 8);
	return `${match[1]}T${seconds}`;
}

/** Convert an HTML date/time input value into a SQL literal-friendly string. */
export function fromInputValue(kind: TemporalKind | null, inputValue: string): string {
	if (!kind || !inputValue) return inputValue;
	if (kind === 'datetime') return inputValue.replace('T', ' ');
	return inputValue;
}

export function inputTypeForColumn(column: ColumnInfo): string {
	const kind = temporalKind(column);
	if (kind === 'date') return 'date';
	if (kind === 'time') return 'time';
	if (kind === 'datetime') return 'datetime-local';
	return 'text';
}
