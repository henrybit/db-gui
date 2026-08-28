<script lang="ts">
	import { workspace } from '$lib/stores/workspace.svelte';
	import { engineLabel } from '$lib/engine';

	const selected = $derived(workspace.selection);
	const active = $derived(
		selected ? workspace.connections.find((item) => item.id === selected.connectionId) : null
	);
</script>

<footer class="status-bar">
	<span>{workspace.error ?? workspace.lastMessage ?? workspace.status}</span>
	<span>
		{#if workspace.busy}
			{workspace.pending.size} task(s)
		{:else}
			{engineLabel(active?.engine)}
		{/if}
	</span>
</footer>
