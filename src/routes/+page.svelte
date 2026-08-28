<script lang="ts">
	import { workspace } from '$lib/stores/workspace.svelte';
	import WelcomePanel from '$lib/components/workspace/WelcomePanel.svelte';
	import ObjectList from '$lib/components/workspace/ObjectList.svelte';
	import TableWorkspace from '$lib/components/workspace/TableWorkspace.svelte';
	import DdlViewer from '$lib/components/workspace/DdlViewer.svelte';
	import QueryEditor from '$lib/components/workspace/QueryEditor.svelte';

	const tab = $derived(workspace.activeTab);
</script>

{#if !tab}
	<WelcomePanel />
{:else if tab.kind === 'objects' && tab.schema}
	<ObjectList
		connectionId={tab.connectionId}
		schema={tab.schema}
		folder={tab.folder ?? 'tables'}
	/>
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
{:else if tab.kind === 'query'}
	<QueryEditor tabId={tab.id} connectionId={tab.connectionId} schema={tab.schema} sql={tab.sql ?? ''} />
{/if}
