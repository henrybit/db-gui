<script lang="ts">
	import { workspace } from '$lib/stores/workspace.svelte';
	import type { ContextMenuAction } from '$lib/api/types';

	const menu = $derived(workspace.contextMenu);

	function run(action: ContextMenuAction) {
		if (!menu) return;
		const { connectionId, schema, objectKind, objectName } = menu;
		switch (action) {
			case 'new-connection':
				workspace.openNewConnection();
				break;
			case 'edit-connection':
				if (connectionId) workspace.openEditConnection(connectionId);
				break;
			case 'delete-connection':
				if (connectionId) workspace.askDeleteConnection(connectionId);
				break;
			case 'connect':
				if (connectionId) void workspace.connect(connectionId);
				break;
			case 'disconnect':
				if (connectionId) void workspace.disconnect(connectionId);
				break;
			case 'new-query':
				if (connectionId) workspace.openQuery(connectionId, schema);
				break;
			case 'refresh':
				if (connectionId) void workspace.refresh(connectionId, schema);
				break;
			case 'open-data':
				if (connectionId && schema && objectName) {
					workspace.openTable(connectionId, schema, objectName, objectKind === 'view');
				}
				break;
			case 'open-structure':
				if (connectionId && schema && objectName) {
					workspace.openTable(connectionId, schema, objectName, objectKind === 'view');
				}
				break;
			case 'open-ddl':
				if (connectionId && schema && objectKind && objectName) {
					workspace.openDdl(connectionId, schema, objectKind, objectName);
				}
				break;
		}
		workspace.closeMenu();
	}

	const labels: Record<ContextMenuAction, string> = {
		'new-connection': 'New Connection…',
		'edit-connection': 'Edit Connection…',
		'delete-connection': 'Delete Connection',
		connect: 'Connect',
		disconnect: 'Disconnect',
		'new-query': 'New Query',
		refresh: 'Refresh',
		'open-data': 'Open Table',
		'open-structure': 'Design Table',
		'open-ddl': 'View DDL'
	};
</script>

{#if menu}
	<div
		class="context-menu"
		style:left="{menu.x}px"
		style:top="{menu.y}px"
		role="menu"
	>
		{#each menu.actions as action (action)}
			<button type="button" onclick={() => run(action)}>{labels[action]}</button>
		{/each}
	</div>
	<button class="modal-backdrop" style="background:transparent" onclick={() => workspace.closeMenu()}
		aria-label="Close menu"></button>
{/if}
