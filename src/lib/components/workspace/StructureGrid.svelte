<script lang="ts">
	import type { ColumnInfo } from '$lib/api/types';

	let { columns }: { columns: ColumnInfo[] } = $props();
</script>

<div class="data-grid-wrap">
	<table class="data-grid">
		<thead>
			<tr>
				<th>#</th>
				<th>Name</th>
				<th>Type</th>
				<th>Nullable</th>
				<th>Key</th>
				<th>Default</th>
				<th>Extra</th>
				<th>Comment</th>
			</tr>
		</thead>
		<tbody>
			{#each columns as column (column.name)}
				<tr>
					<td>{column.ordinal}</td>
					<td>{column.name}</td>
					<td>{column.columnType}</td>
					<td>{column.nullable ? 'YES' : 'NO'}</td>
					<td>{column.key || '—'}</td>
					<td>
						{#if column.defaultValue == null}
							<span class="null-cell">(NULL)</span>
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
</div>
