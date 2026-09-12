<script lang="ts">
	import { api, errorMessage } from '$lib/api/tauri';
	import { formatDuration, formatNumber } from '$lib/format';
	import { afterPaint } from '$lib/runtime/jobs';
	import { workspace } from '$lib/stores/workspace.svelte';
	import type { ColumnInfo, QueryResult } from '$lib/api/types';
	import { toInputValue, temporalKind } from '$lib/sql/column-types';
	import {
		buildDeleteSql,
		buildInsertSql,
		buildInsertSqlFromRow,
		buildUpdateSql,
		editableColumns,
		insertableColumns,
		primaryKeyColumns
	} from '$lib/sql/row-mutations';
	import DataGrid from './DataGrid.svelte';
	import RecordFormView from './RecordFormView.svelte';
	import RowEditorDialog from './RowEditorDialog.svelte';
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
	let dataView = $state<'grid' | 'form'>('grid');
	let columns = $state<ColumnInfo[]>([]);
	let result = $state<QueryResult | null>(null);
	let ddl = $state('');
	let error = $state<string | null>(null);
	let success = $state<string | null>(null);
	let page = $state(0);
	let pageSize = $state(100);
	let loading = $state(false);
	let requestId = 0;
	let selectedRow = $state(0);
	let mutating = $state(false);
	let editorMode = $state<'insert' | 'edit' | null>(null);
	let editorValues = $state<Record<string, string>>({});
	let editorError = $state<string | null>(null);
	let editSourceRow = $state<Array<string | null> | null>(null);
	let confirmDeleteOpen = $state(false);
	let rowMenu = $state<{ x: number; y: number; index: number } | null>(null);
	let successTimer: ReturnType<typeof setTimeout> | null = null;

	const connection = $derived(workspace.connections.find((item) => item.id === connectionId));
	const engine = $derived(connection?.engine);
	const estimatedRows = $derived(
		workspace.schema[connectionId]?.tables[schema]?.find((item) => item.name === name)?.tableRows ??
			null
	);
	const canMutate = $derived(!isView);
	const hasSelection = $derived(!!result && result.rows.length > 0 && selectedRow < result.rows.length);
	const editFormColumns = $derived.by(() => {
		const keys = primaryKeyColumns(columns);
		const editable = editableColumns(columns);
		return editable.length ? [...keys, ...editable] : insertableColumns(columns);
	});
	const formColumns = $derived(editorMode === 'edit' ? editFormColumns : insertableColumns(columns));
	const readonlyNames = $derived(
		editorMode === 'edit' && editableColumns(columns).length
			? primaryKeyColumns(columns).map((column) => column.name)
			: []
	);

	function cellValue(column: ColumnInfo, row: Array<string | null>): string {
		if (!result) return '';
		const index = result.columns.findIndex((item) => item.name === column.name);
		if (index < 0) return '';
		return toInputValue(temporalKind(column), row[index] ?? null);
	}

	async function loadData() {
		const id = ++requestId;
		loading = true;
		error = null;
		success = null;
		try {
			await afterPaint();
			const next = await api.previewTable(connectionId, schema, name, pageSize, page * pageSize);
			if (id !== requestId) return;
			result = next;
			selectedRow = Math.min(selectedRow, Math.max(0, next.rows.length - 1));
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

	function closeEditor() {
		editorMode = null;
		editorError = null;
		editSourceRow = null;
	}

	function openInsert() {
		editorError = null;
		editSourceRow = null;
		const next: Record<string, string> = {};
		for (const column of insertableColumns(columns)) next[column.name] = '';
		editorValues = next;
		editorMode = 'insert';
	}

	function openEdit() {
		if (!hasSelection || !result) return;
		editorError = null;
		const row = result.rows[selectedRow];
		editSourceRow = row;
		const next: Record<string, string> = {};
		for (const column of editFormColumns) next[column.name] = cellValue(column, row);
		editorValues = next;
		editorMode = 'edit';
	}

	async function submitEditor() {
		if (mutating || !editorMode) return;
		mutating = true;
		editorError = null;
		error = null;
		try {
			const sql =
				editorMode === 'insert'
					? buildInsertSql(engine, schema, name, columns, editorValues)
					: buildUpdateSql(
							engine,
							schema,
							name,
							columns,
							result!.columns,
							editSourceRow!,
							editorValues
						);
			await afterPaint();
			await api.executeSql(connectionId, sql, schema);
			closeEditor();
			await loadData();
		} catch (err) {
			editorError = errorMessage(err);
		} finally {
			mutating = false;
		}
	}

	function askDelete() {
		if (!hasSelection || !result) return;
		confirmDeleteOpen = true;
	}

	function showSuccess(message: string) {
		success = message;
		workspace.error = null;
		workspace.status = message;
		if (successTimer) clearTimeout(successTimer);
		successTimer = setTimeout(() => {
			if (success === message) success = null;
			successTimer = null;
		}, 2500);
	}

	function openRowMenu(event: MouseEvent, index: number) {
		event.preventDefault();
		rowMenu = { x: event.clientX, y: event.clientY, index };
	}

	function closeRowMenu() {
		rowMenu = null;
	}

	async function copyRowToSql() {
		if (!result || rowMenu == null) return;
		const index = rowMenu.index;
		const row = result.rows[index];
		if (!row) {
			closeRowMenu();
			return;
		}
		closeRowMenu();
		try {
			const sql = buildInsertSqlFromRow(engine, schema, name, result.columns, row);
			await navigator.clipboard.writeText(sql);
			error = null;
			showSuccess('Copied INSERT SQL to clipboard');
		} catch (err) {
			success = null;
			error = errorMessage(err);
		}
	}

	async function confirmDelete() {
		if (!hasSelection || !result || mutating) return;
		mutating = true;
		error = null;
		confirmDeleteOpen = false;
		try {
			const row = result.rows[selectedRow];
			const sql = buildDeleteSql(engine, schema, name, columns, result.columns, row);
			await afterPaint();
			await api.executeSql(connectionId, sql, schema);
			await loadData();
		} catch (err) {
			error = errorMessage(err);
		} finally {
			mutating = false;
		}
	}

	function refreshData() {
		void loadData();
	}

	$effect(() => {
		void connectionId;
		void schema;
		void name;
		void page;
		void pageSize;
		void workspace.tableDataRevision(connectionId, schema, name);
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
	{:else if success}
		<div class="message success">{success}</div>
	{/if}
	{#if mode === 'data'}
		<div class="filter-bar">
			<button class="btn" disabled={page === 0} onclick={() => (page = Math.max(0, page - 1))}>Prev</button>
			<button class="btn" onclick={() => (page += 1)}>Next</button>
			<button class="btn" disabled={loading} onclick={refreshData} title="Reload the latest records"
				>Refresh</button
			>
			<span>Page {page + 1} · {pageSize} rows</span>
			{#if estimatedRows != null}
				<span>~{formatNumber(estimatedRows)}</span>
			{/if}
			{#if result}
				<span>{formatDuration(result.durationMs)}</span>
			{/if}
			{#if loading}<span>Loading…</span>{/if}
			<div class="view-mode-switch" role="group" aria-label="Data view mode">
				<button
					class="btn"
					class:active={dataView === 'grid'}
					type="button"
					title="Grid view"
					onclick={() => (dataView = 'grid')}>Grid</button
				>
				<button
					class="btn"
					class:active={dataView === 'form'}
					type="button"
					title="Form view — one record, fields stacked vertically"
					onclick={() => (dataView = 'form')}>Form</button
				>
			</div>
			{#if canMutate}
				<div class="filter-bar-actions">
					<button class="btn" disabled={mutating} onclick={openInsert}>Insert</button>
					<button class="btn" disabled={mutating || !hasSelection} onclick={openEdit}>Edit</button>
					<button
						class="btn danger"
						disabled={mutating || !hasSelection}
						onclick={askDelete}>Delete</button
					>
				</div>
			{/if}
		</div>
		{#if result}
			{#if dataView === 'grid'}
				<DataGrid {result} bind:selectedRow onRowContextMenu={openRowMenu} />
			{:else}
				<RecordFormView {result} bind:selectedRow onRowContextMenu={openRowMenu} />
			{/if}
		{:else}
			<div class="empty">{loading ? 'Loading data…' : error ? 'Failed to load records' : 'No data'}</div>
		{/if}
	{:else if mode === 'structure'}
		<StructureGrid {columns} />
	{:else}
		<pre class="ddl-view">{ddl || 'Loading DDL…'}</pre>
	{/if}
</div>

{#if editorMode}
	<RowEditorDialog
		title={editorMode === 'insert' ? `Insert into ${name}` : `Edit ${name}`}
		hint={editorMode === 'insert'
			? 'Leave a field empty to use the column default or NULL. Date/time fields open a calendar picker.'
			: 'Primary key fields are read-only. Clear a nullable field to set NULL. Date/time fields open a calendar picker.'}
		columns={formColumns}
		bind:values={editorValues}
		{readonlyNames}
		error={editorError}
		pending={mutating}
		submitLabel={editorMode === 'insert' ? 'Insert' : 'Save'}
		pendingLabel={editorMode === 'insert' ? 'Inserting…' : 'Saving…'}
		onCancel={closeEditor}
		onSubmit={submitEditor}
	/>
{/if}

{#if confirmDeleteOpen && result && hasSelection}
	<div class="modal-backdrop">
		<div class="modal" role="dialog" aria-modal="true" aria-labelledby="delete-row-title">
			<header id="delete-row-title">Delete row</header>
			<div class="body">
				<p>
					Delete the selected row{#if primaryKeyColumns(columns).length}
						(matched by primary key){:else}
						(matched by all columns){/if}?
				</p>
			</div>
			<footer>
				<button class="btn" onclick={() => (confirmDeleteOpen = false)} disabled={mutating}>Cancel</button>
				<button class="btn danger" onclick={() => void confirmDelete()} disabled={mutating}>
					{mutating ? 'Deleting…' : 'Delete'}
				</button>
			</footer>
		</div>
	</div>
{/if}

{#if rowMenu}
	<div class="context-menu" style:left="{rowMenu.x}px" style:top="{rowMenu.y}px" role="menu">
		<button type="button" onclick={() => void copyRowToSql()}>Copy to SQL</button>
	</div>
	<button class="modal-backdrop" style="background:transparent" onclick={closeRowMenu} aria-label="Close menu"
	></button>
{/if}
