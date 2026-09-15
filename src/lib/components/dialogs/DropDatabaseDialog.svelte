<script lang="ts">
	import { workspace } from '$lib/stores/workspace.svelte';
	import { schemaNounLabel, schemaNounLower, t } from '$lib/i18n/i18n.svelte';

	const prompt = $derived(workspace.dropDatabasePrompt);
	const noun = $derived(schemaNounLabel(prompt?.engine));
	const nounLower = $derived(schemaNounLower(prompt?.engine));
	const pending = $derived(
		prompt ? workspace.isPending(`drop-db:${prompt.connectionId}:${prompt.name}`) : false
	);
</script>

{#if prompt}
	<div class="modal-backdrop">
		<div class="modal" role="dialog" aria-modal="true">
			<header>{t('dialog.dropNounTitle', { noun })}</header>
			<div class="body">
				<p>
					{t('dialog.dropNounBody', {
						noun: nounLower,
						name: prompt.name,
						connection: prompt.connectionName
					})}
				</p>
			</div>
			<footer>
				<button class="btn" onclick={() => (workspace.dropDatabasePrompt = null)} disabled={pending}
					>{t('dialog.cancel')}</button
				>
				<button class="btn danger" onclick={() => workspace.confirmDropDatabase()} disabled={pending}
					>{pending ? t('dialog.dropping') : t('dialog.delete')}</button
				>
			</footer>
		</div>
	</div>
{/if}
