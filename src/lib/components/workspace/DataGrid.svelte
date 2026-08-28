<script lang="ts">
	import type { QueryResult } from '$lib/api/types';

	const ROW_HEIGHT = 26;
	const OVERSCAN = 12;

	let {
		result,
		selectedRow = $bindable(0)
	}: {
		result: QueryResult;
		selectedRow?: number;
	} = $props();

	let scrollTop = $state(0);
	let viewportHeight = $state(360);

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
					onkeydown={(event) => event.key === 'Enter' && (selectedRow = index)}
					tabindex="0"
				>
					<td>{index + 1}</td>
					{#each row as cell, cellIndex (`${index}-${cellIndex}`)}
						<td title={cell ?? 'NULL'}>
							{#if cell == null}
								<span class="null-cell">(NULL)</span>
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
		<div class="empty" style="height:120px">No rows</div>
	{/if}
</div>
