<script lang="ts">
	import type { ColumnInfo } from '$lib/api/types';
	import { t } from '$lib/i18n/i18n.svelte';

	let {
		columns,
		selectedIndex = $bindable(0),
		onRowDblClick
	}: {
		columns: ColumnInfo[];
		selectedIndex?: number;
		onRowDblClick?: (index: number) => void;
	} = $props();
</script>

<div class="data-grid-wrap">
	<table class="data-grid">
		<thead>
			<tr>
				<th>#</th>
				<th>{t('objects.col.name')}</th>
				<th>{t('objects.col.type')}</th>
				<th>{t('structure.nullable')}</th>
				<th>{t('structure.key')}</th>
				<th>{t('structure.default')}</th>
				<th>{t('structure.extra')}</th>
				<th>{t('objects.col.comment')}</th>
			</tr>
		</thead>
		<tbody>
			{#each columns as column, index (column.name)}
				<tr
					class:selected={selectedIndex === index}
					onclick={() => (selectedIndex = index)}
					ondblclick={() => onRowDblClick?.(index)}
					onkeydown={(event) => event.key === 'Enter' && (selectedIndex = index)}
					tabindex="0"
				>
					<td>{column.ordinal}</td>
					<td>{column.name}</td>
					<td>{column.columnType}</td>
					<td>{column.nullable ? t('objects.yes') : t('objects.no')}</td>
					<td>{column.key || '—'}</td>
					<td>
						{#if column.defaultValue == null}
							<span class="null-cell">{t('grid.null')}</span>
						{:else}
							{column.defaultValue}
						{/if}
					</td>
					<td>{column.extra || '—'}</td>
					<td>{column.comment || '—'}</td>
				</tr>
			{/each}
		</tbody>
	</table>
	{#if columns.length === 0}
		<div class="empty" style="height:120px">{t('structure.noColumns')}</div>
	{/if}
</div>
