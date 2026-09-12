import { describe, expect, it } from 'vitest';
import type { ColumnInfo } from '$lib/api/types';
import {
	fromInputValue,
	inputTypeForColumn,
	temporalKind,
	toInputValue
} from './column-types';

function col(dataType: string, columnType = dataType): ColumnInfo {
	return {
		name: 'c',
		dataType,
		columnType,
		nullable: true,
		key: '',
		defaultValue: null,
		extra: '',
		comment: '',
		ordinal: 1
	};
}

describe('column temporal helpers', () => {
	it('detects temporal kinds', () => {
		expect(temporalKind(col('date'))).toBe('date');
		expect(temporalKind(col('time'))).toBe('time');
		expect(temporalKind(col('datetime'))).toBe('datetime');
		expect(temporalKind(col('timestamp', 'timestamp without time zone'))).toBe('datetime');
		expect(temporalKind(col('varchar'))).toBeNull();
		expect(inputTypeForColumn(col('datetime'))).toBe('datetime-local');
	});

	it('converts between SQL and input values', () => {
		expect(toInputValue('date', '2024-01-15 00:00:00')).toBe('2024-01-15');
		expect(toInputValue('time', '14:30:05')).toBe('14:30:05');
		expect(toInputValue('datetime', '2024-01-15 14:30:05')).toBe('2024-01-15T14:30:05');
		expect(toInputValue('datetime', '2024-01-15T14:30')).toBe('2024-01-15T14:30:00');
		expect(fromInputValue('datetime', '2024-01-15T14:30:05')).toBe('2024-01-15 14:30:05');
		expect(fromInputValue('date', '2024-01-15')).toBe('2024-01-15');
	});
});
