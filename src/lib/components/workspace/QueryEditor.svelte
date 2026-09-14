<script lang="ts">
	import { untrack } from 'svelte';
	import { api, errorMessage } from '$lib/api/tauri';
	import { formatDuration, formatNumber } from '$lib/format';
	import { afterPaint } from '$lib/runtime/jobs';
	import { isPostgres } from '$lib/engine';
	import { formatSql } from '$lib/sql/format';
	import { workspace } from '$lib/stores/workspace.svelte';
	import StackSplit from '$lib/components/layout/StackSplit.svelte';
	import { t } from '$lib/i18n/i18n.svelte';
	import DataGrid from './DataGrid.svelte';
	import SqlEditor from './SqlEditor.svelte';

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
				? t('query.searchPath', { schema })
				: t('query.useSchema', { schema })
			: t('query.noSchema')
	);

	function format() {
		try {
			const next = formatSql(text, connection?.engine);
			if (next === text) return;
			text = next;
			workspace.setTabSql(tabId, next);
			workspace.lastMessage = null;
		} catch {
			workspace.lastMessage = t('query.formatFailed');
		}
	}

	async function run() {
		running = true;
		error = null;
		workspace.setTabSql(tabId, text);
		try {
			await afterPaint();
			const queryResult = await api.executeSql(connectionId, text, schema);
			const summary = queryResult.columns.length
				? t('query.summaryRows', {
						count: formatNumber(queryResult.rows.length),
						duration: formatDuration(queryResult.durationMs)
					})
				: t('query.summaryAffected', {
						count: formatNumber(queryResult.affectedRows),
						duration: formatDuration(queryResult.durationMs)
					});
			workspace.setQueryResult(
				tabId,
				queryResult,
				queryResult.truncated ? t('query.summaryTruncated', { summary }) : summary
			);
		} catch (err) {
			error = errorMessage(err);
			workspace.setQueryResult(tabId, null, error);
		} finally {
			running = false;
		}
	}
</script>

<div class="object-list">
	<div class="filter-bar">
		<button class="btn primary" onclick={run} disabled={running}
			>{running ? t('query.running') : t('query.run')}</button
		>
		<button class="btn" onclick={format} disabled={running || !text.trim()}
			>{t('query.format')}</button
		>
		<span style="color:var(--text-muted)"
			>{schemaHint} · {t('query.shortcut')} · {t('query.formatShortcut')}</span
		>
	</div>
	<StackSplit>
		{#snippet top()}
			<SqlEditor bind:value={text} engine={connection?.engine} onRun={run} onFormat={format} />
		{/snippet}
		{#snippet bottom()}
			{#if error}
				<div class="message error">{error}</div>
			{:else if result}
				<div class="message">
					{result.statementKind}
					{#if result.columns.length}
						· {t('query.rows', { count: formatNumber(result.rows.length) })}
					{:else}
						· {t('query.affected', { count: formatNumber(result.affectedRows) })}
					{/if}
					· {formatDuration(result.durationMs)}
					{#if result.truncated}· {t('query.truncated')}{/if}
				</div>
				{#if result.columns.length}
					<DataGrid {result} />
				{/if}
			{:else}
				<div class="empty">{t('query.empty')}</div>
			{/if}
		{/snippet}
	</StackSplit>
</div>
