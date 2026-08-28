<script lang="ts">
	import { workspace } from '$lib/stores/workspace.svelte';
	import { formatBytes, formatNumber } from '$lib/format';
	import type { FolderKind } from '$lib/api/types';

	let {
		connectionId,
		schema,
		folder
	}: {
		connectionId: string;
		schema: string;
		folder: FolderKind;
	} = $props();

	let filter = $state('');
	const cache = $derived(workspace.schema[connectionId]);
	const loading = $derived(
		workspace.isPending(workspace.folderJobKey(connectionId, schema, folder))
	);

	const rows = $derived.by(() => {
		const q = filter.trim().toLowerCase();
		if (folder === 'tables') {
			return (cache?.tables[schema] ?? [])
				.filter((item) => item.name.toLowerCase().includes(q))
				.map((item) => ({
					key: item.name,
					cells: [
						item.name,
						item.engine ?? '—',
						formatNumber(item.tableRows),
						formatBytes(item.dataLength),
						item.comment || '—',
						item.createdAt ?? '—'
					]
				}));
		}
		if (folder === 'views') {
			return (cache?.views[schema] ?? [])
				.filter((item) => item.name.toLowerCase().includes(q))
				.map((item) => ({
					key: item.name,
					cells: [
						item.name,
						item.updatable ? 'YES' : 'NO',
						item.securityType ?? '—',
						item.definer ?? '—'
					]
				}));
		}
		if (folder === 'indexes') {
			return (cache?.indexes[schema] ?? [])
				.filter((item) => `${item.tableName}.${item.name}`.toLowerCase().includes(q))
				.map((item) => ({
					key: `${item.tableName}.${item.name}`,
					cells: [
						item.name,
						item.tableName,
						item.primary ? 'PRIMARY' : item.unique ? 'UNIQUE' : 'INDEX',
						item.indexType,
						item.columns.join(', ')
					]
				}));
		}
		if (folder === 'triggers') {
			return (cache?.triggers[schema] ?? [])
				.filter((item) => item.name.toLowerCase().includes(q))
				.map((item) => ({
					key: item.name,
					cells: [item.name, item.tableName, item.timing, item.event, item.definer ?? '—']
				}));
		}
		return (cache?.routines[schema] ?? [])
			.filter((item) => item.name.toLowerCase().includes(q))
			.map((item) => ({
				key: item.name,
				cells: [
					item.name,
					item.routineType,
					item.returns ?? '—',
					item.deterministic ? 'YES' : 'NO',
					item.definer ?? '—'
				]
			}));
	});

	const headers = $derived(
		folder === 'tables'
			? ['Name', 'Engine', 'Rows', 'Size', 'Comment', 'Created']
			: folder === 'views'
				? ['Name', 'Updatable', 'Security', 'Definer']
				: folder === 'indexes'
					? ['Name', 'Table', 'Kind', 'Type', 'Columns']
					: folder === 'triggers'
						? ['Name', 'Table', 'Timing', 'Event', 'Definer']
						: ['Name', 'Type', 'Returns', 'Deterministic', 'Definer']
	);

	function open(name: string) {
		if (folder === 'tables') workspace.openTable(connectionId, schema, name, false);
		else if (folder === 'views') workspace.openTable(connectionId, schema, name, true);
		else if (folder === 'indexes') return;
		else if (folder === 'functions') {
			const routine = cache?.routines[schema]?.find((item) => item.name === name);
			workspace.openDdl(
				connectionId,
				schema,
				routine?.routineType === 'PROCEDURE' ? 'procedure' : 'function',
				name
			);
		} else workspace.openDdl(connectionId, schema, 'trigger', name);
	}
</script>

<div class="object-list">
	<div class="filter-bar">
		<strong style="text-transform:capitalize">{folder}</strong>
		<span style="color:var(--text-muted)">{schema}</span>
		<input placeholder="Filter objects" bind:value={filter} />
	</div>
	<div class="data-grid-wrap">
		<table class="data-grid">
			<thead>
				<tr>
					{#each headers as header (header)}
						<th>{header}</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each rows as row (row.key)}
					<tr ondblclick={() => open(row.cells[0])}>
						{#each row.cells as cell, index (`${row.key}-${index}`)}
							<td>{cell}</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
		{#if rows.length === 0}
			<div class="empty">{loading ? 'Loading…' : 'No objects'}</div>
		{/if}
	</div>
</div>
