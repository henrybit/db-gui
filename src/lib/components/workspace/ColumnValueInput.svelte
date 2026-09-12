<script lang="ts">
	import type { ColumnInfo } from '$lib/api/types';
	import { inputTypeForColumn, temporalKind } from '$lib/sql/column-types';
	import { t } from '$lib/i18n/i18n.svelte';

	let {
		column,
		value = $bindable(''),
		disabled = false,
		readonly = false
	}: {
		column: ColumnInfo;
		value?: string;
		disabled?: boolean;
		readonly?: boolean;
	} = $props();

	const kind = $derived(temporalKind(column));
	const type = $derived(inputTypeForColumn(column));
	const placeholder = $derived(
		column.defaultValue != null
			? t('input.default', { value: column.defaultValue })
			: column.nullable
				? t('input.null')
				: column.columnType
	);
</script>

{#if kind}
	<input
		class="temporal-input"
		{type}
		step={kind === 'date' ? undefined : '1'}
		bind:value
		{disabled}
		{readonly}
		title={column.columnType}
	/>
{:else}
	<input bind:value {placeholder} {disabled} {readonly} title={column.columnType} />
{/if}
