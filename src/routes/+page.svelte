<script lang="ts">
	import { workspace } from '$lib/stores/workspace.svelte';
	import { nextMountedTabIds, sameStringSet } from '$lib/runtime/tab-keepalive';
	import WelcomePanel from '$lib/components/workspace/WelcomePanel.svelte';
	import ObjectList from '$lib/components/workspace/ObjectList.svelte';
	import TableWorkspace from '$lib/components/workspace/TableWorkspace.svelte';
	import DdlViewer from '$lib/components/workspace/DdlViewer.svelte';
	import QueryEditor from '$lib/components/workspace/QueryEditor.svelte';

	let mountedTabIds = $state(new Set<string>());

	$effect(() => {
		const openIds = new Set(workspace.tabs.map((tab) => tab.id));
		const next = nextMountedTabIds(mountedTabIds, openIds, workspace.activeTabId);
		if (!sameStringSet(mountedTabIds, next)) {
			mountedTabIds = next;
		}
	});
</script>

{#if workspace.tabs.length === 0}
	<WelcomePanel />
{:else}
	<div class="tab-panels">
		{#each workspace.tabs as tab (tab.id)}
			{#if mountedTabIds.has(tab.id)}
				{@const active = workspace.activeTabId === tab.id}
				<div class="tab-panel" class:active hidden={!active} aria-hidden={!active}>
					{#if tab.kind === 'objects' && tab.schema}
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
						<QueryEditor
							tabId={tab.id}
							connectionId={tab.connectionId}
							schema={tab.schema}
							sql={tab.sql ?? ''}
							autoRun={tab.autoRun === true}
							{active}
						/>
					{/if}
				</div>
			{/if}
		{/each}
	</div>
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
