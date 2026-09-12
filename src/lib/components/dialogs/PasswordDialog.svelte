<script lang="ts">
	import { workspace } from '$lib/stores/workspace.svelte';
	import { t } from '$lib/i18n/i18n.svelte';

	let password = $state('');
</script>

<div class="modal-backdrop">
	<div class="modal" role="dialog" aria-modal="true">
		<header>{t('dialog.connectTo', { name: workspace.passwordPrompt?.name ?? '' })}</header>
		<div class="body">
			<label class="field">
				<span>{t('dialog.password')}</span>
				<input type="password" bind:value={password} />
			</label>
		</div>
		<footer>
			<button class="btn" onclick={() => (workspace.passwordPrompt = null)}>{t('dialog.cancel')}</button>
			<button
				class="btn primary"
				onclick={() =>
					workspace.passwordPrompt && workspace.connect(workspace.passwordPrompt.id, password)}
			>
				{t('dialog.connect')}
			</button>
		</footer>
	</div>
</div>
