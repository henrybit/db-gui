import type { CharsetCatalog, CharsetInfo, CollationInfo } from '$lib/api/types';

export interface ComboboxOption {
	value: string;
	hint?: string;
}

export function filterComboboxOptions(options: ComboboxOption[], query: string): ComboboxOption[] {
	const needle = query.trim().toLowerCase();
	if (!needle) return options;
	return options.filter(
		(option) =>
			option.value.toLowerCase().includes(needle) ||
			(option.hint?.toLowerCase().includes(needle) ?? false)
	);
}

export function collationsForCharset(collations: CollationInfo[], charset: string): CollationInfo[] {
	const needle = charset.trim().toLowerCase();
	if (!needle) return collations;
	return collations.filter((item) => item.charset.toLowerCase() === needle);
}

export function charsetOptions(charsets: CharsetInfo[]): ComboboxOption[] {
	return charsets.map((item) => ({
		value: item.name,
		hint: item.description ?? undefined
	}));
}

export function collationOptions(collations: CollationInfo[]): ComboboxOption[] {
	return collations.map((item) => ({
		value: item.name,
		hint: item.isDefault ? 'default' : item.charset
	}));
}

export const FALLBACK_CHARSET_CATALOG: CharsetCatalog = {
	charsets: [
		{ name: 'utf8mb4', defaultCollation: 'utf8mb4_0900_ai_ci', description: 'UTF-8 Unicode' },
		{ name: 'utf8mb3', defaultCollation: 'utf8mb3_general_ci', description: 'UTF-8 Unicode (3-byte)' },
		{ name: 'latin1', defaultCollation: 'latin1_swedish_ci', description: 'cp1252 West European' },
		{ name: 'ascii', defaultCollation: 'ascii_general_ci', description: 'US ASCII' },
		{ name: 'binary', defaultCollation: 'binary', description: 'Binary pseudo charset' },
		{ name: 'gb18030', defaultCollation: 'gb18030_chinese_ci', description: 'China National Standard GB18030' },
		{ name: 'gbk', defaultCollation: 'gbk_chinese_ci', description: 'GBK Simplified Chinese' },
		{ name: 'gb2312', defaultCollation: 'gb2312_chinese_ci', description: 'GB2312 Simplified Chinese' },
		{ name: 'big5', defaultCollation: 'big5_chinese_ci', description: 'Big5 Traditional Chinese' },
		{ name: 'ujis', defaultCollation: 'ujis_japanese_ci', description: 'EUC-JP Japanese' },
		{ name: 'sjis', defaultCollation: 'sjis_japanese_ci', description: 'Shift-JIS Japanese' },
		{ name: 'euckr', defaultCollation: 'euckr_korean_ci', description: 'EUC-KR Korean' },
		{ name: 'utf16', defaultCollation: 'utf16_general_ci', description: 'UTF-16 Unicode' },
		{ name: 'utf32', defaultCollation: 'utf32_general_ci', description: 'UTF-32 Unicode' },
		{ name: 'ucs2', defaultCollation: 'ucs2_general_ci', description: 'UCS-2 Unicode' }
	],
	collations: [
		{ name: 'utf8mb4_0900_ai_ci', charset: 'utf8mb4', isDefault: true },
		{ name: 'utf8mb4_general_ci', charset: 'utf8mb4', isDefault: false },
		{ name: 'utf8mb4_unicode_ci', charset: 'utf8mb4', isDefault: false },
		{ name: 'utf8mb4_unicode_520_ci', charset: 'utf8mb4', isDefault: false },
		{ name: 'utf8mb4_bin', charset: 'utf8mb4', isDefault: false },
		{ name: 'utf8mb4_0900_as_ci', charset: 'utf8mb4', isDefault: false },
		{ name: 'utf8mb4_0900_as_cs', charset: 'utf8mb4', isDefault: false },
		{ name: 'utf8mb4_0900_bin', charset: 'utf8mb4', isDefault: false },
		{ name: 'utf8mb3_general_ci', charset: 'utf8mb3', isDefault: true },
		{ name: 'utf8mb3_unicode_ci', charset: 'utf8mb3', isDefault: false },
		{ name: 'utf8mb3_bin', charset: 'utf8mb3', isDefault: false },
		{ name: 'latin1_swedish_ci', charset: 'latin1', isDefault: true },
		{ name: 'latin1_general_ci', charset: 'latin1', isDefault: false },
		{ name: 'latin1_bin', charset: 'latin1', isDefault: false },
		{ name: 'ascii_general_ci', charset: 'ascii', isDefault: true },
		{ name: 'ascii_bin', charset: 'ascii', isDefault: false },
		{ name: 'binary', charset: 'binary', isDefault: true },
		{ name: 'gb18030_chinese_ci', charset: 'gb18030', isDefault: true },
		{ name: 'gbk_chinese_ci', charset: 'gbk', isDefault: true },
		{ name: 'gbk_bin', charset: 'gbk', isDefault: false },
		{ name: 'gb2312_chinese_ci', charset: 'gb2312', isDefault: true },
		{ name: 'big5_chinese_ci', charset: 'big5', isDefault: true },
		{ name: 'ujis_japanese_ci', charset: 'ujis', isDefault: true },
		{ name: 'sjis_japanese_ci', charset: 'sjis', isDefault: true },
		{ name: 'euckr_korean_ci', charset: 'euckr', isDefault: true },
		{ name: 'utf16_general_ci', charset: 'utf16', isDefault: true },
		{ name: 'utf32_general_ci', charset: 'utf32', isDefault: true },
		{ name: 'ucs2_general_ci', charset: 'ucs2', isDefault: true }
	]
};
