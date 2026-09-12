<script lang="ts">
	import { onMount } from 'svelte';
	import { api, errorMessage } from '$lib/api/tauri';
	import type { ObjectKind } from '$lib/api/types';
	import { t } from '$lib/i18n/i18n.svelte';

	let {
		connectionId,
		schema,
		name,
		kind
	}: {
		connectionId: string;
		schema: string;
		name: string;
		kind: ObjectKind;
	} = $props();

	let ddl = $state('');
	let error = $state<string | null>(null);

	onMount(async () => {
		try {
			ddl = await api.getDdl(connectionId, schema, kind, name);
		} catch (err) {
			error = errorMessage(err);
		}
	});
</script>

<div class="object-list">
	<div class="filter-bar">
		<strong>{kind}</strong>
		<span>{schema}.{name}</span>
	</div>
	{#if error}
		<div class="message error">{error}</div>
	{/if}
	<pre class="ddl-view">{ddl || (error ? '' : t('table.loadingDdl'))}</pre>
</div>
