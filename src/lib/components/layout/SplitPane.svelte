<script lang="ts">
	let { left, right } = $props<{
		left: import('svelte').Snippet;
		right: import('svelte').Snippet;
	}>();

	let width = $state(280);
	let dragging = $state(false);

	function start(event: PointerEvent) {
		dragging = true;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}

	function move(event: PointerEvent) {
		if (!dragging) return;
		width = Math.min(480, Math.max(220, event.clientX));
	}

	function end() {
		dragging = false;
	}
</script>

<div class="workspace" style:--tree-width="{width}px">
	<div class="tree-pane">
		{@render left()}
	</div>
	<div
		class="split-handle"
		class:active={dragging}
		onpointerdown={start}
		onpointermove={move}
		onpointerup={end}
		role="separator"
		aria-orientation="vertical"
	></div>
	{@render right()}
</div>
