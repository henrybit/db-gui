<script lang="ts">
	import type { QueryResult } from '$lib/api/types';
	import CellDetailDrawer from './CellDetailDrawer.svelte';

	const EXPAND_MIN_CHARS = 120;

	let {
		result,
		selectedRow = $bindable(0),
		onRowContextMenu
	}: {
		result: QueryResult;
		selectedRow?: number;
		onRowContextMenu?: (event: MouseEvent, index: number) => void;
	} = $props();

	let detail = $state<{
		columnName: string;
		columnType?: string;
		value: string;
	} | null>(null);

	const total = $derived(result.rows.length);
	const safeIndex = $derived(total === 0 ? 0 : Math.min(selectedRow, total - 1));
	const row = $derived(total > 0 ? result.rows[safeIndex] : null);

	$effect(() => {
		if (total > 0 && selectedRow >= total) selectedRow = total - 1;
		if (selectedRow < 0) selectedRow = 0;
	});

	function needsExpand(value: string): boolean {
		return value.length >= EXPAND_MIN_CHARS || /[\r\n]/.test(value);
	}

	function openDetail(columnIndex: number, value: string) {
		const column = result.columns[columnIndex];
		detail = {
			columnName: column?.name ?? `Column ${columnIndex + 1}`,
			columnType: column?.typeName,
			value
		};
	}

	function goPrev() {
		if (safeIndex > 0) selectedRow = safeIndex - 1;
	}

	function goNext() {
		if (safeIndex < total - 1) selectedRow = safeIndex + 1;
	}

	function onKey(event: KeyboardEvent) {
		if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
			event.preventDefault();
			goPrev();
		} else if (event.key === 'ArrowRight' || event.key === 'PageDown') {
			event.preventDefault();
			goNext();
		}
	}
</script>

<div class="record-form-view" tabindex="0" onkeydown={onKey} role="region" aria-label="Form view">
	<div class="record-form-nav">
		<button class="btn" type="button" disabled={total === 0 || safeIndex === 0} onclick={goPrev}
			>Previous record</button
		>
		<span class="record-form-pos">
			{#if total === 0}
				No records
			{:else}
				Record {safeIndex + 1} of {total}
			{/if}
		</span>
		<button class="btn" type="button" disabled={total === 0 || safeIndex >= total - 1} onclick={goNext}
			>Next record</button
		>
	</div>

	{#if row}
		<div
			class="record-form-fields"
			oncontextmenu={(event) => onRowContextMenu?.(event, safeIndex)}
			role="presentation"
		>
			{#each result.columns as column, columnIndex (column.name)}
				{@const cell = row[columnIndex]}
				<div class="record-form-field">
					<div class="record-form-label" title={column.typeName}>
						<span class="truncate">{column.name}</span>
						{#if column.typeName}
							<span class="record-form-type truncate">{column.typeName}</span>
						{/if}
					</div>
					<div class="record-form-value-wrap">
						{#if cell == null}
							<span class="null-cell">(NULL)</span>
						{:else}
							<pre class="record-form-value">{cell}</pre>
							{#if needsExpand(cell)}
								<button
									class="cell-expand"
									type="button"
									title="View full value"
									aria-label="View full value of {column.name}"
									onclick={() => openDetail(columnIndex, cell)}
								>
									…
								</button>
							{/if}
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="empty" style="height:120px">No rows</div>
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
