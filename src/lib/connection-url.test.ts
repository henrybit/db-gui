import { describe, expect, it } from 'vitest';
import {
	connectionUrlPlaceholder,
	looksLikeConnectionUrl,
	parseConnectionUrl
} from './connection-url';

describe('connection url', () => {
	it('uses engine-specific placeholders', () => {
		expect(connectionUrlPlaceholder('mysql')).toBe('mysql://root:password@127.0.0.1:3306/database');
		expect(connectionUrlPlaceholder('pgsql')).toBe(
			'postgresql://postgres:password@127.0.0.1:5432/postgres'
		);
	});

	it('detects supported schemes', () => {
		expect(looksLikeConnectionUrl('postgresql://u:p@h:5432/db')).toBe(true);
		expect(looksLikeConnectionUrl('postgres://h/db')).toBe(true);
		expect(looksLikeConnectionUrl('pgsql://h/db')).toBe(true);
		expect(looksLikeConnectionUrl('mysql://root@127.0.0.1:3306/app')).toBe(true);
		expect(looksLikeConnectionUrl('mariadb://root@127.0.0.1/app')).toBe(true);
		expect(looksLikeConnectionUrl('127.0.0.1')).toBe(false);
	});

	it('parses mysql and mariadb urls', () => {
		expect(parseConnectionUrl('mysql://app:s3cret@db.example.com:3306/shop')).toEqual({
			engine: 'mysql',
			host: 'db.example.com',
			port: 3306,
			username: 'app',
			password: 's3cret',
			database: 'shop',
			sslCa: ''
		});
		expect(parseConnectionUrl('mariadb://root@127.0.0.1/app')).toEqual({
			engine: 'mysql',
			host: '127.0.0.1',
			port: 3306,
			username: 'root',
			password: '',
			database: 'app',
			sslCa: ''
		});
	});

	it('parses mysql ssl-ca query parameter', () => {
		expect(
			parseConnectionUrl(
				'mysql://3RongwYzrjiCbcf.root:secret@gateway01.example.com:4000/account?ssl-ca=/etc/ssl/cert.pem'
			)
		).toEqual({
			engine: 'mysql',
			host: 'gateway01.example.com',
			port: 4000,
			username: '3RongwYzrjiCbcf.root',
			password: 'secret',
			database: 'account',
			sslCa: '/etc/ssl/cert.pem'
		});
		expect(
			parseConnectionUrl('mysql://root@127.0.0.1:3306/app?sslca=%2Fetc%2Fssl%2Fcert.pem')?.sslCa
		).toBe('/etc/ssl/cert.pem');
	});

	it('parses supabase-style postgresql urls', () => {
		const parsed = parseConnectionUrl(
			'postgresql://postgres:[YOUR-PASSWORD]@spb-bp1gvnmm7m9oat33.supabase.opentrust.net:5432/postgres'
		);
		expect(parsed).toEqual({
			engine: 'postgres',
			host: 'spb-bp1gvnmm7m9oat33.supabase.opentrust.net',
			port: 5432,
			username: 'postgres',
			password: '[YOUR-PASSWORD]',
			database: 'postgres',
			sslCa: ''
		});
	});

	it('decodes percent-encoded credentials and database', () => {
		const parsed = parseConnectionUrl(
			'postgresql://user:p%40ss%3Aword@db.example.com:5432/my%2Fdb'
		);
		expect(parsed).toEqual({
			engine: 'postgres',
			host: 'db.example.com',
			port: 5432,
			username: 'user',
			password: 'p@ss:word',
			database: 'my/db',
			sslCa: ''
		});
	});

	it('applies engine defaults when port or database omitted', () => {
		expect(parseConnectionUrl('postgres://alice@db.example.com')).toEqual({
			engine: 'postgres',
			host: 'db.example.com',
			port: 5432,
			username: 'alice',
			password: '',
			database: 'postgres',
			sslCa: ''
		});
		expect(parseConnectionUrl('mysql://root@127.0.0.1/')).toEqual({
			engine: 'mysql',
			host: '127.0.0.1',
			port: 3306,
			username: 'root',
			password: '',
			database: '',
			sslCa: ''
		});
	});

	it('returns null for invalid urls', () => {
		expect(parseConnectionUrl('postgresql://')).toBeNull();
		expect(parseConnectionUrl('not-a-url')).toBeNull();
	});
});
