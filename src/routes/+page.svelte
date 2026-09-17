<script lang="ts">
	import { workspace } from '$lib/stores/workspace.svelte';
	import WelcomePanel from '$lib/components/workspace/WelcomePanel.svelte';
	import ObjectList from '$lib/components/workspace/ObjectList.svelte';
	import TableWorkspace from '$lib/components/workspace/TableWorkspace.svelte';
	import DdlViewer from '$lib/components/workspace/DdlViewer.svelte';
	import QueryEditor from '$lib/components/workspace/QueryEditor.svelte';

	const tab = $derived(workspace.activeTab);
	const queryTabs = $derived(workspace.tabs.filter((item) => item.kind === 'query'));
</script>

{#if !tab}
	<WelcomePanel />
{:else if tab.kind === 'objects' && tab.schema}
	<ObjectList connectionId={tab.connectionId} schema={tab.schema} folder={tab.folder ?? 'tables'} />
{:else if (tab.kind === 'table' || tab.kind === 'view') && tab.schema && tab.objectName}
	<TableWorkspace
		connectionId={tab.connectionId}
		schema={tab.schema}
		name={tab.objectName}
		isView={tab.kind === 'view'}
	/>
{:else if tab.kind === 'ddl' && tab.schema && tab.objectName && tab.objectKind}
	<DdlViewer
		connectionId={tab.connectionId}
		schema={tab.schema}
		name={tab.objectName}
		kind={tab.objectKind}
	/>
{/if}

{#each queryTabs as queryTab (queryTab.id)}
	{#if tab?.id === queryTab.id || !queryTab.sqlCached}
		<div class="query-tab-keep" hidden={tab?.id !== queryTab.id}>
			<QueryEditor
				tabId={queryTab.id}
				connectionId={queryTab.connectionId}
				schema={queryTab.schema}
				sql={queryTab.sql ?? ''}
				sqlCached={queryTab.sqlCached === true}
				autoRun={queryTab.autoRun === true}
				active={tab?.id === queryTab.id}
			/>
		</div>
	{/if}
{/each}
