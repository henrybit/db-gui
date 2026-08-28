<script lang="ts">
	import { workspace } from '$lib/stores/workspace.svelte';

	let password = $state('');
</script>

<div class="modal-backdrop">
	<div class="modal" role="dialog" aria-modal="true">
		<header>Connect to {workspace.passwordPrompt?.name}</header>
		<div class="body">
			<label class="field">
				<span>Password</span>
				<input type="password" bind:value={password} />
			</label>
		</div>
		<footer>
			<button class="btn" onclick={() => (workspace.passwordPrompt = null)}>Cancel</button>
			<button
				class="btn primary"
				onclick={() =>
					workspace.passwordPrompt && workspace.connect(workspace.passwordPrompt.id, password)}
			>
				Connect
			</button>
		</footer>
	</div>
</div>
