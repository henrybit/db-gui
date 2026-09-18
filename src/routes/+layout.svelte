<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.png';
	import AppShell from '$lib/components/layout/AppShell.svelte';
	import { t } from '$lib/i18n/i18n.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<title>{t('app.title')}</title>
	<link rel="icon" href={favicon} />
</svelte:head>

<AppShell>
	{@render children()}
</AppShell>
