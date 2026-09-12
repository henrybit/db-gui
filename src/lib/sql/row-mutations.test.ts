import { describe, expect, it } from 'vitest';
import type { ColumnInfo, ColumnMeta } from '$lib/api/types';
import {
	buildDeleteSql,
	buildInsertSql,
	buildInsertSqlFromRow,
	buildUpdateSql,
	insertableColumns
} from './row-mutations';

function col(partial: Partial<ColumnInfo> & Pick<ColumnInfo, 'name'>): ColumnInfo {
	return {
		dataType: 'varchar',
		columnType: 'varchar(255)',
		nullable: true,
		key: '',
		defaultValue: null,
		extra: '',
		comment: '',
		ordinal: 1,
		...partial
	};
}

describe('row mutations', () => {
	const columns: ColumnInfo[] = [
		col({ name: 'id', key: 'PRI', nullable: false, dataType: 'int', columnType: 'int', extra: 'auto_increment' }),
		col({ name: 'name', nullable: false }),
		col({ name: 'note', nullable: true }),
		col({ name: 'created_at', dataType: 'datetime', columnType: 'datetime', nullable: true })
	];
	const resultColumns: ColumnMeta[] = [
		{ name: 'id', typeName: 'int' },
		{ name: 'name', typeName: 'varchar' },
		{ name: 'note', typeName: 'varchar' },
		{ name: 'created_at', typeName: 'datetime' }
	];

	it('skips generated columns for insert', () => {
		expect(insertableColumns(columns).map((item) => item.name)).toEqual([
			'name',
			'note',
			'created_at'
		]);
	});

	it('builds insert SQL from filled values', () => {
		expect(buildInsertSql('mysql', 'shop', 'users', columns, { name: "O'Brien", note: '' })).toBe(
			"INSERT INTO `shop`.`users` (`name`) VALUES ('O''Brien')"
		);
	});

	it('normalizes datetime-local values on insert', () => {
		expect(
			buildInsertSql('mysql', 'shop', 'users', columns, {
				name: 'Ada',
				created_at: '2024-01-15T14:30:05'
			})
		).toBe(
			"INSERT INTO `shop`.`users` (`name`, `created_at`) VALUES ('Ada', '2024-01-15 14:30:05')"
		);
	});

	it('builds delete SQL with primary key and MySQL LIMIT', () => {
		expect(
			buildDeleteSql('mysql', 'shop', 'users', columns, resultColumns, ['1', 'Ada', null, null])
		).toBe("DELETE FROM `shop`.`users` WHERE `id` = '1' LIMIT 1");
	});

	it('builds postgres delete without LIMIT', () => {
		expect(
			buildDeleteSql('postgres', 'public', 'users', columns, resultColumns, ['1', 'Ada', null, null])
		).toBe('DELETE FROM "public"."users" WHERE "id" = \'1\'');
	});

	it('builds update SQL for editable columns', () => {
		expect(
			buildUpdateSql(
				'mysql',
				'shop',
				'users',
				columns,
				resultColumns,
				['1', 'Ada', null, '2024-01-15 10:00:00'],
				{ name: 'Bob', note: '', created_at: '2024-01-16T11:00:00' }
			)
		).toBe(
			"UPDATE `shop`.`users` SET `name` = 'Bob', `note` = NULL, `created_at` = '2024-01-16 11:00:00' WHERE `id` = '1'"
		);
	});

	it('builds insert SQL from a result row including NULL and PK', () => {
		expect(
			buildInsertSqlFromRow('mysql', 'shop', 'users', resultColumns, [
				'1',
				"O'Brien",
				null,
				'2024-01-15 10:00:00'
			])
		).toBe(
			"INSERT INTO `shop`.`users` (`id`, `name`, `note`, `created_at`) VALUES ('1', 'O''Brien', NULL, '2024-01-15 10:00:00')"
		);
	});

	it('builds postgres insert SQL from a result row', () => {
		expect(
			buildInsertSqlFromRow('postgres', 'public', 'users', resultColumns, [
				'1',
				'Ada',
				null,
				null
			])
		).toBe(
			'INSERT INTO "public"."users" ("id", "name", "note", "created_at") VALUES (\'1\', \'Ada\', NULL, NULL)'
		);
	});
});
