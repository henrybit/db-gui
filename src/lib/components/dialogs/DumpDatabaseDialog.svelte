<script lang="ts">
	import { workspace } from '$lib/stores/workspace.svelte';
	import { schemaNounLabel, schemaNounLower, t } from '$lib/i18n/i18n.svelte';

	const prompt = $derived(workspace.dumpDatabasePrompt);
	const noun = $derived(schemaNounLabel(prompt?.engine));
	const nounLower = $derived(schemaNounLower(prompt?.engine));
	const pending = $derived(
		prompt ? workspace.isPending(`dump-db:${prompt.connectionId}:${prompt.name}`) : false
	);

	let includeData = $state(true);

	function cancel() {
		workspace.dumpDatabasePrompt = null;
	}

	function submit(event?: SubmitEvent) {
		event?.preventDefault();
		if (pending) return;
		void workspace.confirmDumpDatabase(includeData);
	}
</script>

{#if prompt}
	<div class="modal-backdrop">
		<div class="modal" role="dialog" aria-modal="true">
			<form onsubmit={submit}>
				<header>{t('dialog.dumpNounTitle', { noun })}</header>
				<div class="body">
					<p>
						{t('dialog.dumpNounBody', {
							noun: nounLower,
							name: prompt.name,
							connection: prompt.connectionName
						})}
					</p>
					<label class="field">
						<span>{t('dialog.dumpIncludeData')}</span>
						<input type="checkbox" bind:checked={includeData} disabled={pending} />
					</label>
					<p class="hint">{t('dialog.dumpHint')}</p>
				</div>
				<footer>
					<button class="btn" type="button" onclick={cancel} disabled={pending}
						>{t('dialog.cancel')}</button
					>
					<button class="btn primary" type="submit" disabled={pending}
						>{pending ? t('dialog.dumping') : t('dialog.dump')}</button
					>
				</footer>
			</form>
		</div>
	</div>
{/if}
