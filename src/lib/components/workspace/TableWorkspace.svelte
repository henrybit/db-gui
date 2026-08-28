<script lang="ts">
	import { api, errorMessage } from '$lib/api/tauri';
	import { formatDuration, formatNumber } from '$lib/format';
	import { afterPaint } from '$lib/runtime/jobs';
	import { workspace } from '$lib/stores/workspace.svelte';
	import type { ColumnInfo, QueryResult } from '$lib/api/types';
	import DataGrid from './DataGrid.svelte';
	import StructureGrid from './StructureGrid.svelte';

	let {
		connectionId,
		schema,
		name,
		isView
	}: {
		connectionId: string;
		schema: string;
		name: string;
		isView: boolean;
	} = $props();

	let mode = $state<'data' | 'structure' | 'ddl'>('data');
	let columns = $state<ColumnInfo[]>([]);
	let result = $state<QueryResult | null>(null);
	let ddl = $state('');
	let error = $state<string | null>(null);
	let page = $state(0);
	let pageSize = $state(100);
	let loading = $state(false);
	let requestId = 0;

	const estimatedRows = $derived(
		workspace.schema[connectionId]?.tables[schema]?.find((item) => item.name === name)?.tableRows ??
			null
	);

	async function loadData() {
		const id = ++requestId;
		loading = true;
		error = null;
		try {
			await afterPaint();
			const next = await api.previewTable(connectionId, schema, name, pageSize, page * pageSize);
			if (id !== requestId) return;
			result = next;
		} catch (err) {
			if (id !== requestId) return;
			error = errorMessage(err);
		} finally {
			if (id === requestId) loading = false;
		}
	}

	async function loadStructure() {
		try {
			await afterPaint();
			columns = await api.getColumns(connectionId, schema, name);
		} catch (err) {
			error = errorMessage(err);
		}
	}

	async function loadDdl() {
		try {
			await afterPaint();
			ddl = await api.getDdl(connectionId, schema, isView ? 'view' : 'table', name);
		} catch (err) {
			error = errorMessage(err);
		}
	}

	$effect(() => {
		void connectionId;
		void schema;
		void name;
		void page;
		void pageSize;
		void loadData();
	});

	$effect(() => {
		void connectionId;
		void schema;
		void name;
		void loadStructure();
	});
</script>

<div class="object-list">
	<div class="subtabs">
		<button class="subtab" class:active={mode === 'data'} onclick={() => (mode = 'data')}>Data</button>
		<button class="subtab" class:active={mode === 'structure'} onclick={() => (mode = 'structure')}
			>Structure</button
		>
		<button
			class="subtab"
			class:active={mode === 'ddl'}
			onclick={() => {
				mode = 'ddl';
				if (!ddl) void loadDdl();
			}}>DDL</button
		>
	</div>
	{#if error}
		<div class="message error">{error}</div>
	{/if}
	{#if mode === 'data'}
		<div class="filter-bar">
			<button class="btn" disabled={page === 0} onclick={() => (page = Math.max(0, page - 1))}>Prev</button>
			<button class="btn" onclick={() => (page += 1)}>Next</button>
			<span>Page {page + 1} · {pageSize} rows</span>
			{#if estimatedRows != null}
				<span>~{formatNumber(estimatedRows)}</span>
			{/if}
			{#if result}
				<span>{formatDuration(result.durationMs)}</span>
			{/if}
			{#if loading}<span>Loading…</span>{/if}
		</div>
		{#if result}
			<DataGrid {result} />
		{:else}
			<div class="empty">Loading data…</div>
		{/if}
	{:else if mode === 'structure'}
		<StructureGrid {columns} />
	{:else}
		<pre class="ddl-view">{ddl || 'Loading DDL…'}</pre>
	{/if}
</div>
