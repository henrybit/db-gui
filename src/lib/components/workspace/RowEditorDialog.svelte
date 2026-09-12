<script lang="ts">
	import type { ColumnInfo } from '$lib/api/types';
	import ColumnValueInput from './ColumnValueInput.svelte';

	let {
		title,
		hint,
		columns,
		values = $bindable<Record<string, string>>({}),
		readonlyNames = [],
		error = null,
		pending = false,
		submitLabel,
		pendingLabel,
		onCancel,
		onSubmit
	}: {
		title: string;
		hint: string;
		columns: ColumnInfo[];
		values?: Record<string, string>;
		readonlyNames?: string[];
		error?: string | null;
		pending?: boolean;
		submitLabel: string;
		pendingLabel: string;
		onCancel: () => void;
		onSubmit: () => void | Promise<void>;
	} = $props();

	const readonlySet = $derived(new Set(readonlyNames));

	function submit(event: SubmitEvent) {
		event.preventDefault();
		void onSubmit();
	}
</script>

<div class="modal-backdrop">
	<div class="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="row-editor-title">
		<form onsubmit={submit}>
			<header id="row-editor-title">{title}</header>
			<div class="body scrollable">
				<p>{hint}</p>
				{#each columns as column (column.name)}
					<label class="field">
						<span title={column.columnType}
							>{column.name}{#if !column.nullable && column.defaultValue == null && !readonlySet.has(column.name)}<span
									class="required">*</span
								>{/if}</span
						>
						<ColumnValueInput
							{column}
							bind:value={values[column.name]}
							disabled={pending}
							readonly={readonlySet.has(column.name)}
						/>
					</label>
				{/each}
				{#if error}
					<div class="message error">{error}</div>
				{/if}
			</div>
			<footer>
				<button class="btn" type="button" onclick={onCancel} disabled={pending}>Cancel</button>
				<button class="btn primary" type="submit" disabled={pending}>
					{pending ? pendingLabel : submitLabel}
				</button>
			</footer>
		</form>
	</div>
</div>
