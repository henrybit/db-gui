<script module lang="ts">
	let savedRatio: number | undefined;
</script>

<script lang="ts">
	import { t } from '$lib/i18n/i18n.svelte';

	let {
		top,
		bottom,
		minPx = 72
	}: {
		top: import('svelte').Snippet;
		bottom: import('svelte').Snippet;
		minPx?: number;
	} = $props();

	let root = $state<HTMLDivElement | undefined>(undefined);
	let ratio = $state(savedRatio ?? 0.42);
	let dragging = $state(false);

	function start(event: PointerEvent) {
		event.preventDefault();
		dragging = true;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}

	function move(event: PointerEvent) {
		if (!dragging || !root) return;
		const rect = root.getBoundingClientRect();
		if (rect.height <= minPx * 2) return;
		const min = minPx / rect.height;
		const max = 1 - minPx / rect.height;
		ratio = Math.min(max, Math.max(min, (event.clientY - rect.top) / rect.height));
		savedRatio = ratio;
	}

	function end() {
		dragging = false;
	}
</script>

<div
	class="stack-split"
	class:dragging
	bind:this={root}
	style:--split-size="{(ratio * 100).toFixed(2)}%"
>
	<div class="stack-split-top">
		{@render top()}
	</div>
	<div
		class="split-handle horizontal"
		class:active={dragging}
		onpointerdown={start}
		onpointermove={move}
		onpointerup={end}
		onpointercancel={end}
		onlostpointercapture={end}
		role="separator"
		aria-orientation="horizontal"
		aria-label={t('split.resize')}
	></div>
	<div class="stack-split-bottom">
		{@render bottom()}
	</div>
</div>
