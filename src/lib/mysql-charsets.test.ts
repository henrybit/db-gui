import { describe, expect, it } from 'vitest';
import {
	FALLBACK_CHARSET_CATALOG,
	charsetOptions,
	collationOptions,
	collationsForCharset,
	filterComboboxOptions
} from './mysql-charsets';

describe('charset combobox helpers', () => {
	it('filters by value or hint', () => {
		const options = charsetOptions(FALLBACK_CHARSET_CATALOG.charsets);
		expect(filterComboboxOptions(options, 'gbk').map((item) => item.value)).toEqual(['gbk']);
		expect(filterComboboxOptions(options, 'unicode').some((item) => item.value === 'utf8mb4')).toBe(
			true
		);
		expect(filterComboboxOptions(options, '  ').length).toBe(options.length);
	});

	it('limits collations to the selected charset', () => {
		const utf8 = collationsForCharset(FALLBACK_CHARSET_CATALOG.collations, 'utf8mb4');
		expect(utf8.every((item) => item.charset === 'utf8mb4')).toBe(true);
		expect(utf8.some((item) => item.name === 'utf8mb4_unicode_ci')).toBe(true);
		expect(collationsForCharset(FALLBACK_CHARSET_CATALOG.collations, '').length).toBe(
			FALLBACK_CHARSET_CATALOG.collations.length
		);
	});

	it('marks default collations in option hints', () => {
		const options = collationOptions(FALLBACK_CHARSET_CATALOG.collations);
		expect(options.find((item) => item.value === 'utf8mb4_0900_ai_ci')?.hint).toBe('default');
	});
});
