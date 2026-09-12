<script lang="ts">
	import { onMount } from 'svelte';
	import { localeTag, t } from '$lib/i18n/i18n.svelte';

	let {
		columnName,
		columnType,
		value,
		onClose
	}: {
		columnName: string;
		columnType?: string;
		value: string;
		onClose: () => void;
	} = $props();

	let copied = $state(false);
	let copyTimer: ReturnType<typeof setTimeout> | null = null;

	onMount(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				event.preventDefault();
				onClose();
			}
		};
		window.addEventListener('keydown', onKey);
		return () => {
			window.removeEventListener('keydown', onKey);
			if (copyTimer) clearTimeout(copyTimer);
		};
	});

	async function copyValue() {
		try {
			await navigator.clipboard.writeText(value);
			copied = true;
			if (copyTimer) clearTimeout(copyTimer);
			copyTimer = setTimeout(() => (copied = false), 1500);
		} catch {
			copied = false;
		}
	}
</script>

<button class="cell-detail-backdrop" type="button" aria-label={t('detail.closeAria')} onclick={onClose}
></button>
<aside class="cell-detail-drawer" role="dialog" aria-modal="true" aria-labelledby="cell-detail-title">
	<header>
		<div class="cell-detail-heading">
			<span id="cell-detail-title" class="truncate" title={columnName}>{columnName}</span>
			{#if columnType}
				<span class="cell-detail-type" title={columnType}>{columnType}</span>
			{/if}
		</div>
		<button class="btn" type="button" onclick={onClose}>{t('detail.close')}</button>
	</header>
	<div class="cell-detail-body">
		<pre class="cell-detail-value">{value}</pre>
	</div>
	<footer>
		<span class="cell-detail-meta"
			>{t('detail.chars', { count: value.length.toLocaleString(localeTag()) })}</span
		>
		<button class="btn primary" type="button" onclick={copyValue}>
			{copied ? t('detail.copied') : t('detail.copy')}
		</button>
	</footer>
</aside>
