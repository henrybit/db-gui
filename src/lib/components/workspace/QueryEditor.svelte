<script lang="ts">
	import { untrack } from 'svelte';
	import { api, errorMessage } from '$lib/api/tauri';
	import { formatDuration, formatNumber } from '$lib/format';
	import { afterPaint } from '$lib/runtime/jobs';
	import { isPostgres } from '$lib/engine';
	import { workspace } from '$lib/stores/workspace.svelte';
	import StackSplit from '$lib/components/layout/StackSplit.svelte';
	import DataGrid from './DataGrid.svelte';

	let {
		tabId,
		connectionId,
		schema,
		sql
	}: {
		tabId: string;
		connectionId: string;
		schema?: string;
		sql: string;
	} = $props();

	let text = $state(untrack(() => sql));
	let running = $state(false);
	let error = $state<string | null>(null);
	const result = $derived(workspace.queryResults[tabId] ?? null);
	const connection = $derived(workspace.connections.find((item) => item.id === connectionId));
	const schemaHint = $derived(
		schema
			? isPostgres(connection?.engine)
				? `search_path ${schema}`
				: `USE ${schema}`
			: 'No default schema'
	);

	async function run() {
		running = true;
		error = null;
		workspace.setTabSql(tabId, text);
		try {
			await afterPaint();
			const queryResult = await api.executeSql(connectionId, text, schema);
			const summary = queryResult.columns.length
				? `${formatNumber(queryResult.rows.length)} row(s) in ${formatDuration(queryResult.durationMs)}`
				: `${formatNumber(queryResult.affectedRows)} row(s) affected in ${formatDuration(queryResult.durationMs)}`;
			workspace.setQueryResult(
				tabId,
				queryResult,
				queryResult.truncated ? `${summary} (truncated)` : summary
			);
		} catch (err) {
			error = errorMessage(err);
			workspace.setQueryResult(tabId, null, error);
		} finally {
			running = false;
		}
	}

	function onKey(event: KeyboardEvent) {
		if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
			event.preventDefault();
			void run();
		}
	}
</script>

<div class="object-list">
	<div class="filter-bar">
		<button class="btn primary" onclick={run} disabled={running}>{running ? 'Running…' : 'Run'}</button>
		<span style="color:var(--text-muted)">{schemaHint} · ⌘/Ctrl+Enter</span>
	</div>
	<StackSplit>
		{#snippet top()}
			<textarea class="sql-editor" bind:value={text} onkeydown={onKey} spellcheck="false"></textarea>
		{/snippet}
		{#snippet bottom()}
			{#if error}
				<div class="message error">{error}</div>
			{:else if result}
				<div class="message">
					{result.statementKind}
					{#if result.columns.length}
						· {formatNumber(result.rows.length)} rows
					{:else}
						· {formatNumber(result.affectedRows)} affected
					{/if}
					· {formatDuration(result.durationMs)}
					{#if result.truncated}· truncated{/if}
				</div>
				{#if result.columns.length}
					<DataGrid {result} />
				{/if}
			{:else}
				<div class="empty">Run a query to see results</div>
			{/if}
		{/snippet}
	</StackSplit>
</div>
