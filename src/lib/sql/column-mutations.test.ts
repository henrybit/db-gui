import { describe, expect, it } from 'vitest';
import type { ColumnInfo } from '$lib/api/types';
import {
	buildAddColumnSql,
	buildAlterColumnSql,
	buildDropColumnSql,
	columnSpecFromInfo,
	formatDefaultExpr
} from './column-mutations';

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

describe('formatDefaultExpr', () => {
	it('quotes plain strings and keeps expressions', () => {
		expect(formatDefaultExpr('hello')).toBe("'hello'");
		expect(formatDefaultExpr('CURRENT_TIMESTAMP')).toBe('CURRENT_TIMESTAMP');
		expect(formatDefaultExpr('42')).toBe('42');
		expect(formatDefaultExpr("nextval('users_id_seq')")).toBe("nextval('users_id_seq')");
	});
});

describe('buildAddColumnSql', () => {
	it('builds mysql add with comment', () => {
		expect(
			buildAddColumnSql('mysql', 'shop', 'users', {
				name: 'bio',
				columnType: 'text',
				nullable: true,
				defaultValue: '',
				comment: "user's bio"
			})
		).toEqual([
			"ALTER TABLE `shop`.`users` ADD COLUMN `bio` text NULL COMMENT 'user''s bio'"
		]);
	});

	it('builds postgres add plus comment statement', () => {
		expect(
			buildAddColumnSql('postgres', 'public', 'users', {
				name: 'bio',
				columnType: 'text',
				nullable: false,
				defaultValue: '',
				comment: 'note'
			})
		).toEqual([
			'ALTER TABLE "public"."users" ADD COLUMN "bio" text NOT NULL',
			`COMMENT ON COLUMN "public"."users"."bio" IS 'note'`
		]);
	});
});

describe('buildDropColumnSql', () => {
	it('quotes identifiers per dialect', () => {
		expect(buildDropColumnSql('mysql', 'shop', 'users', 'bio')).toBe(
			'ALTER TABLE `shop`.`users` DROP COLUMN `bio`'
		);
		expect(buildDropColumnSql('postgres', 'public', 'users', 'bio')).toBe(
			'ALTER TABLE "public"."users" DROP COLUMN "bio"'
		);
	});
});

describe('buildAlterColumnSql', () => {
	it('returns empty when unchanged', () => {
		const before = col({ name: 'name', nullable: false, comment: 'n' });
		expect(buildAlterColumnSql('mysql', 'shop', 'users', before, columnSpecFromInfo(before))).toEqual(
			[]
		);
	});

	it('uses mysql MODIFY for type/null/default/comment', () => {
		const before = col({ name: 'name', nullable: true, defaultValue: null });
		expect(
			buildAlterColumnSql('mysql', 'shop', 'users', before, {
				name: 'name',
				columnType: 'varchar(100)',
				nullable: false,
				defaultValue: 'x',
				comment: 'label'
			})
		).toEqual([
			"ALTER TABLE `shop`.`users` MODIFY COLUMN `name` varchar(100) NOT NULL DEFAULT 'x' COMMENT 'label'"
		]);
	});

	it('uses mysql CHANGE when renaming', () => {
		const before = col({ name: 'name', nullable: false });
		expect(
			buildAlterColumnSql('mysql', 'shop', 'users', before, {
				name: 'full_name',
				columnType: 'varchar(255)',
				nullable: false,
				defaultValue: '',
				comment: ''
			})
		).toEqual([
			'ALTER TABLE `shop`.`users` CHANGE COLUMN `name` `full_name` varchar(255) NOT NULL'
		]);
	});

	it('splits postgres alters into discrete statements', () => {
		const before = col({
			name: 'name',
			columnType: 'character varying(50)',
			nullable: true,
			defaultValue: null,
			comment: ''
		});
		expect(
			buildAlterColumnSql('postgres', 'public', 'users', before, {
				name: 'full_name',
				columnType: 'character varying(100)',
				nullable: false,
				defaultValue: 'n/a',
				comment: 'label'
			})
		).toEqual([
			'ALTER TABLE "public"."users" RENAME COLUMN "name" TO "full_name"',
			'ALTER TABLE "public"."users" ALTER COLUMN "full_name" TYPE character varying(100)',
			'ALTER TABLE "public"."users" ALTER COLUMN "full_name" SET NOT NULL',
			`ALTER TABLE "public"."users" ALTER COLUMN "full_name" SET DEFAULT 'n/a'`,
			`COMMENT ON COLUMN "public"."users"."full_name" IS 'label'`
		]);
	});
});
