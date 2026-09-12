<script lang="ts">
	import type { QueryResult } from '$lib/api/types';
	import { t } from '$lib/i18n/i18n.svelte';
	import CellDetailDrawer from './CellDetailDrawer.svelte';

	const ROW_HEIGHT = 26;
	const OVERSCAN = 12;
	/** Show expand control when content is likely clipped by the 420px cell max-width. */
	const EXPAND_MIN_CHARS = 48;

	let {
		result,
		selectedRow = $bindable(0),
		onRowContextMenu
	}: {
		result: QueryResult;
		selectedRow?: number;
		onRowContextMenu?: (event: MouseEvent, index: number) => void;
	} = $props();

	let scrollTop = $state(0);
	let viewportHeight = $state(360);
	let detail = $state<{
		columnName: string;
		columnType?: string;
		value: string;
	} | null>(null);

	const colCount = $derived(result.columns.length + 1);
	const start = $derived(Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN));
	const visibleCount = $derived(Math.ceil(viewportHeight / ROW_HEIGHT) + OVERSCAN * 2);
	const end = $derived(Math.min(result.rows.length, start + visibleCount));
	const visibleRows = $derived(result.rows.slice(start, end));
	const useWindow = $derived(result.rows.length > 80);

	function onScroll(event: Event) {
		const target = event.currentTarget as HTMLElement;
		scrollTop = target.scrollTop;
		viewportHeight = target.clientHeight;
	}

	function needsExpand(value: string): boolean {
		return value.length >= EXPAND_MIN_CHARS || /[\r\n]/.test(value);
	}

	function openDetail(event: MouseEvent, cellIndex: number, value: string) {
		event.stopPropagation();
		const column = result.columns[cellIndex];
		detail = {
			columnName: column?.name ?? t('grid.columnFallback', { n: cellIndex + 1 }),
			columnType: column?.typeName,
			value
		};
	}
</script>

<div class="data-grid-wrap" onscroll={onScroll}>
	<table class="data-grid">
		<thead>
			<tr>
				<th style="width:48px">#</th>
				{#each result.columns as column (column.name)}
					<th title={column.typeName}>{column.name}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#if useWindow && start > 0}
				<tr class="spacer-row" aria-hidden="true">
					<td colspan={colCount} style="height:{start * ROW_HEIGHT}px;padding:0;border:none"></td>
				</tr>
			{/if}
			{#each visibleRows as row, offset (`${start + offset}`)}
				{@const index = useWindow ? start + offset : offset}
				<tr
					class:selected={selectedRow === index}
					onclick={() => (selectedRow = index)}
					oncontextmenu={(event) => {
						selectedRow = index;
						onRowContextMenu?.(event, index);
					}}
					onkeydown={(event) => event.key === 'Enter' && (selectedRow = index)}
					tabindex="0"
				>
					<td>{index + 1}</td>
					{#each row as cell, cellIndex (`${index}-${cellIndex}`)}
						<td title={cell ?? t('input.null')}>
							{#if cell == null}
								<span class="null-cell">{t('grid.null')}</span>
							{:else if needsExpand(cell)}
								<span class="cell-inner">
									<span class="cell-text">{cell}</span>
									<button
										class="cell-expand"
										type="button"
										title={t('grid.viewFull')}
										aria-label={t('grid.viewFull')}
										onclick={(event) => openDetail(event, cellIndex, cell)}
									>
										…
									</button>
								</span>
							{:else}
								{cell}
							{/if}
						</td>
					{/each}
				</tr>
			{/each}
			{#if useWindow && end < result.rows.length}
				<tr class="spacer-row" aria-hidden="true">
					<td
						colspan={colCount}
						style="height:{(result.rows.length - end) * ROW_HEIGHT}px;padding:0;border:none"
					></td>
				</tr>
			{/if}
		</tbody>
	</table>
	{#if result.rows.length === 0}
		<div class="empty" style="height:120px">{t('grid.noRows')}</div>
	{/if}
</div>

{#if detail}
	<CellDetailDrawer
		columnName={detail.columnName}
		columnType={detail.columnType}
		value={detail.value}
		onClose={() => (detail = null)}
	/>
{/if}
