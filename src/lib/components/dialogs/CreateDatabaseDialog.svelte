<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api/tauri';
	import type { CharsetCatalog } from '$lib/api/types';
	import { workspace } from '$lib/stores/workspace.svelte';
	import { isPostgres, schemaNoun } from '$lib/engine';
	import Combobox from '$lib/components/layout/Combobox.svelte';
	import {
		FALLBACK_CHARSET_CATALOG,
		charsetOptions,
		collationOptions,
		collationsForCharset
	} from '$lib/mysql-charsets';

	const prompt = $derived(workspace.createDatabasePrompt);
	const noun = $derived(schemaNoun(prompt?.engine));
	const postgres = $derived(isPostgres(prompt?.engine));
	const pending = $derived(
		prompt ? workspace.isPending(`create-db:${prompt.connectionId}`) : false
	);

	let name = $state('');
	let charset = $state('');
	let collation = $state('');
	let catalog = $state<CharsetCatalog>(FALLBACK_CHARSET_CATALOG);
	let nameInput = $state<HTMLInputElement | undefined>(undefined);
	const canSubmit = $derived(name.trim().length > 0 && !pending);
	const charsetOpts = $derived(charsetOptions(catalog.charsets));
	const collationOpts = $derived(
		collationOptions(collationsForCharset(catalog.collations, charset))
	);

	onMount(() => {
		nameInput?.focus();
		const connectionId = prompt?.connectionId;
		if (!connectionId || isPostgres(prompt?.engine)) return;
		void api.listCharsetCatalog(connectionId).then(
			(next) => {
				if (next.charsets.length) catalog = next;
			},
			() => {
				catalog = FALLBACK_CHARSET_CATALOG;
			}
		);
	});

	function cancel() {
		workspace.createDatabasePrompt = null;
	}

	function submit(event?: SubmitEvent) {
		event?.preventDefault();
		if (!canSubmit) return;
		void workspace.confirmCreateDatabase(name, charset, collation);
	}

	function applyCharset(next: string) {
		const known = catalog.charsets.find((item) => item.name === next);
		const allowed = collationsForCharset(catalog.collations, next);
		if (!known) return;
		if (!collation.trim() || (allowed.length && !allowed.some((item) => item.name === collation))) {
			collation = known.defaultCollation ?? allowed.find((item) => item.isDefault)?.name ?? '';
		}
	}
</script>

{#if prompt}
	<div class="modal-backdrop">
		<div class="modal" role="dialog" aria-modal="true" aria-labelledby="create-database-title">
			<form onsubmit={submit}>
				<header id="create-database-title">Create {noun}</header>
				<div class="body">
					<p>
						Create a {noun.toLowerCase()} on “{prompt.connectionName}”{#if postgres && prompt.database}
							in database {prompt.database}{/if}.
					</p>
					<label class="field">
						<span>Name</span>
						<input
							bind:this={nameInput}
							bind:value={name}
							placeholder={postgres ? 'schema name' : 'database name'}
							disabled={pending}
							onkeydown={(event) => {
								if (event.key === 'Escape') cancel();
							}}
						/>
					</label>
					{#if !postgres}
						<div class="field">
							<span>Charset</span>
							<Combobox
								bind:value={charset}
								options={charsetOpts}
								placeholder="search or type, optional"
								disabled={pending}
								onPick={applyCharset}
							/>
						</div>
						<div class="field">
							<span>Collation</span>
							<Combobox
								bind:value={collation}
								options={collationOpts}
								placeholder={charset.trim()
									? 'search or type, optional'
									: 'pick a charset first, or type'}
								disabled={pending}
							/>
						</div>
					{/if}
					{#if workspace.error}
						<div class="message error">{workspace.error}</div>
					{/if}
				</div>
				<footer>
					<button class="btn" type="button" onclick={cancel} disabled={pending}>Cancel</button>
					<button class="btn primary" type="submit" disabled={!canSubmit}>
						{pending ? 'Creating…' : `Create ${noun}`}
					</button>
				</footer>
			</form>
		</div>
	</div>
{/if}
