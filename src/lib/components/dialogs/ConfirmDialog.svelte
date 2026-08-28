<script lang="ts">
	import { workspace } from '$lib/stores/workspace.svelte';
</script>

<div class="modal-backdrop">
	<div class="modal" role="dialog" aria-modal="true">
		<header>Delete connection</header>
		<div class="body">
			<p>Delete “{workspace.confirmDelete?.name}”? This does not drop any database objects.</p>
		</div>
		<footer>
			<button class="btn" onclick={() => (workspace.confirmDelete = null)}>Cancel</button>
			<button class="btn danger" onclick={() => workspace.confirmDeleteConnection()}>Delete</button>
		</footer>
	</div>
</div>
