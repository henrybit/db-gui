<script lang="ts">
	import { Cable, Database, Play, Plus, RefreshCw, Square } from '@lucide/svelte';
	import { engineLabel, schemaNoun } from '$lib/engine';
	import { workspace } from '$lib/stores/workspace.svelte';

	const selected = $derived(workspace.selection);
	const active = $derived(
		selected ? workspace.connections.find((item) => item.id === selected.connectionId) : null
	);
</script>

<header class="toolbar">
	<button class="toolbar-btn primary" onclick={() => workspace.openNewConnection()}>
		<Plus size={14} />
		New Connection
	</button>
	<div class="toolbar-sep"></div>
	<button
		class="toolbar-btn"
		disabled={!active || active.connected || workspace.isPending(`connect:${active.id}`)}
		onclick={() => active && workspace.connect(active.id)}
	>
		<Cable size={14} />
		Connect
	</button>
	<button
		class="toolbar-btn"
		disabled={!active?.connected || workspace.isPending(`disconnect:${active.id}`)}
		onclick={() => active && workspace.disconnect(active.id)}
	>
		<Square size={14} />
		Disconnect
	</button>
	<button
		class="toolbar-btn"
		disabled={!active?.connected}
		onclick={() => active && workspace.askCreateDatabase(active.id)}
	>
		<Database size={14} />
		Create {active ? schemaNoun(active.engine) : 'Database'}
	</button>
	<button
		class="toolbar-btn"
		disabled={!active?.connected}
		onclick={() => active && workspace.openQuery(active.id, selected?.schema)}
	>
		<Play size={14} />
		New Query
	</button>
	<button
		class="toolbar-btn"
		disabled={!active?.connected}
		onclick={() => selected && workspace.refresh(selected.connectionId, selected.schema)}
	>
		<RefreshCw size={14} />
		Refresh
	</button>
	<div class="toolbar-sep"></div>
	<span class="truncate" style="color: var(--text-muted)">
		{#if active}
			<Database size={14} style="display:inline;vertical-align:-2px" />
			{active.name} · {engineLabel(active.engine)} · {active.host}:{active.port}
			{#if active.connected}· connected{:else}· offline{/if}
		{:else}
			No connection selected
		{/if}
	</span>
</header>
