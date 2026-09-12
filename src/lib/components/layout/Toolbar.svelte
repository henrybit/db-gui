<script lang="ts">
	import { Cable, Database, Play, Plus, RefreshCw, Square } from '@lucide/svelte';
	import { engineLabel } from '$lib/engine';
	import { getLocale, schemaNounLabel, setLocale, t, type Locale } from '$lib/i18n/i18n.svelte';
	import { workspace } from '$lib/stores/workspace.svelte';

	const selected = $derived(workspace.selection);
	const active = $derived(
		selected ? workspace.connections.find((item) => item.id === selected.connectionId) : null
	);
	const locale = $derived(getLocale());

	function switchLocale(next: Locale) {
		setLocale(next);
	}
</script>

<header class="toolbar">
	<button class="toolbar-btn primary" onclick={() => workspace.openNewConnection()}>
		<Plus size={14} />
		{t('toolbar.newConnection')}
	</button>
	<div class="toolbar-sep"></div>
	<button
		class="toolbar-btn"
		disabled={!active || active.connected || workspace.isPending(`connect:${active.id}`)}
		onclick={() => active && workspace.connect(active.id)}
	>
		<Cable size={14} />
		{t('toolbar.connect')}
	</button>
	<button
		class="toolbar-btn"
		disabled={!active?.connected || workspace.isPending(`disconnect:${active.id}`)}
		onclick={() => active && workspace.disconnect(active.id)}
	>
		<Square size={14} />
		{t('toolbar.disconnect')}
	</button>
	<button
		class="toolbar-btn"
		disabled={!active?.connected}
		onclick={() => active && workspace.askCreateDatabase(active.id)}
	>
		<Database size={14} />
		{t('toolbar.createNoun', { noun: active ? schemaNounLabel(active.engine) : t('noun.database') })}
	</button>
	<button
		class="toolbar-btn"
		disabled={!active?.connected}
		onclick={() => active && workspace.openQuery(active.id, selected?.schema)}
	>
		<Play size={14} />
		{t('toolbar.newQuery')}
	</button>
	<button
		class="toolbar-btn"
		disabled={!active?.connected}
		onclick={() =>
			selected &&
			workspace.refresh(
				selected.connectionId,
				selected.schema,
				selected.folder,
				selected.objectName
			)}
	>
		<RefreshCw size={14} />
		{t('toolbar.refresh')}
	</button>
	<div class="toolbar-sep"></div>
	<span class="truncate toolbar-status" style="color: var(--text-muted)">
		{#if active}
			<Database size={14} style="display:inline;vertical-align:-2px" />
			{active.name} · {engineLabel(active.engine)} · {active.host}:{active.port}
			{#if active.connected}· {t('toolbar.connected')}{:else}· {t('toolbar.offline')}{/if}
		{:else}
			{t('toolbar.noConnection')}
		{/if}
	</span>
	<div class="locale-switch" role="group" aria-label={t('toolbar.language')}>
		<button
			class="btn"
			class:active={locale === 'en'}
			type="button"
			title="English"
			onclick={() => switchLocale('en')}>{t('toolbar.lang.en')}</button
		>
		<button
			class="btn"
			class:active={locale === 'zh'}
			type="button"
			title="中文"
			onclick={() => switchLocale('zh')}>{t('toolbar.lang.zh')}</button
		>
	</div>
</header>
