<script lang="ts">
	import { onMount } from 'svelte';
	import { ChevronDown } from '@lucide/svelte';
	import { filterComboboxOptions, type ComboboxOption } from '$lib/mysql-charsets';

	let {
		value = $bindable(''),
		options = [],
		placeholder = '',
		disabled = false,
		onPick
	}: {
		value: string;
		options?: ComboboxOption[];
		placeholder?: string;
		disabled?: boolean;
		onPick?: (value: string) => void;
	} = $props();

	let open = $state(false);
	let highlight = $state(0);
	let root = $state<HTMLDivElement | undefined>(undefined);
	const listId = `cb-${Math.random().toString(36).slice(2, 9)}`;
	const filtered = $derived(filterComboboxOptions(options, value));

	onMount(() => {
		const onPointerDown = (event: PointerEvent) => {
			if (!root?.contains(event.target as Node)) open = false;
		};
		window.addEventListener('pointerdown', onPointerDown);
		return () => window.removeEventListener('pointerdown', onPointerDown);
	});

	function pick(next: string) {
		value = next;
		open = false;
		onPick?.(next);
	}

	function onKey(event: KeyboardEvent) {
		if (disabled) return;
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			if (!open) {
				open = true;
				return;
			}
			highlight = Math.min(Math.max(filtered.length - 1, 0), highlight + 1);
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			highlight = Math.max(0, highlight - 1);
		} else if (event.key === 'Enter' && open && filtered[highlight]) {
			event.preventDefault();
			pick(filtered[highlight].value);
		} else if (event.key === 'Escape' && open) {
			event.preventDefault();
			open = false;
		}
	}
</script>

<div class="combobox" class:open bind:this={root}>
	<input
		bind:value
		{placeholder}
		{disabled}
		autocomplete="off"
		spellcheck="false"
		role="combobox"
		aria-expanded={open}
		aria-controls={listId}
		aria-autocomplete="list"
		onfocus={() => {
			if (!disabled) open = true;
		}}
		oninput={() => {
			open = true;
			highlight = 0;
		}}
		onkeydown={onKey}
	/>
	<span class="combobox-caret"><ChevronDown size={14} /></span>
	{#if open && !disabled && (filtered.length > 0 || value.trim())}
		<div class="combobox-list" id={listId} role="listbox">
			{#if filtered.length === 0}
				<button type="button" class="combobox-option custom" onclick={() => pick(value.trim())}>
					Use “{value.trim()}”
				</button>
			{:else}
				{#each filtered as option, index (option.value)}
					<button
						type="button"
						class="combobox-option"
						class:active={index === highlight}
						role="option"
						aria-selected={index === highlight}
						onpointerdown={(event) => {
							event.preventDefault();
							pick(option.value);
						}}
						onpointerenter={() => (highlight = index)}
					>
						<span class="truncate">{option.value}</span>
						{#if option.hint}
							<span class="combobox-hint">{option.hint}</span>
						{/if}
					</button>
				{/each}
			{/if}
		</div>
	{/if}
</div>
