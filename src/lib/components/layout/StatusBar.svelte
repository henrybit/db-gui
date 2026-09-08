<script lang="ts">
	import { workspace } from '$lib/stores/workspace.svelte';
	import { engineLabel } from '$lib/engine';
	import { MAX_OPEN_SESSIONS } from '$lib/sessions';

	const selected = $derived(workspace.selection);
	const active = $derived(
		selected ? workspace.connections.find((item) => item.id === selected.connectionId) : null
	);
	const openCount = $derived(workspace.connections.filter((item) => item.connected).length);
</script>

<footer class="status-bar">
	<span>{workspace.error ?? workspace.lastMessage ?? workspace.status}</span>
	<span>
		{#if workspace.busy}
			{workspace.pending.size} task(s)
		{:else}
			{openCount}/{MAX_OPEN_SESSIONS} open
			{#if active}
				· {engineLabel(active.engine)}
			{/if}
		{/if}
	</span>
</footer>
