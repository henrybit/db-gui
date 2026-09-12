<script lang="ts">
	import { t } from '$lib/i18n/i18n.svelte';
	import type { ColumnSpec } from '$lib/sql/column-mutations';

	let {
		title,
		hint,
		values = $bindable<ColumnSpec>(),
		error = null,
		pending = false,
		submitLabel,
		pendingLabel,
		onCancel,
		onSubmit
	}: {
		title: string;
		hint: string;
		values: ColumnSpec;
		error?: string | null;
		pending?: boolean;
		submitLabel: string;
		pendingLabel: string;
		onCancel: () => void;
		onSubmit: () => void | Promise<void>;
	} = $props();

	function submit(event: SubmitEvent) {
		event.preventDefault();
		void onSubmit();
	}
</script>

<div class="modal-backdrop">
	<div class="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="column-editor-title">
		<form onsubmit={submit}>
			<header id="column-editor-title">{title}</header>
			<div class="body scrollable">
				<p>{hint}</p>
				<label class="field">
					<span>{t('objects.col.name')}<span class="required">*</span></span>
					<input bind:value={values.name} disabled={pending} required />
				</label>
				<label class="field">
					<span>{t('objects.col.type')}<span class="required">*</span></span>
					<input
						bind:value={values.columnType}
						disabled={pending}
						required
						placeholder={t('structure.typePlaceholder')}
					/>
				</label>
				<label class="field">
					<span>{t('structure.nullable')}</span>
					<input type="checkbox" bind:checked={values.nullable} disabled={pending} />
				</label>
				<label class="field">
					<span>{t('structure.default')}</span>
					<input
						bind:value={values.defaultValue}
						disabled={pending}
						placeholder={t('structure.defaultPlaceholder')}
					/>
				</label>
				<label class="field">
					<span>{t('objects.col.comment')}</span>
					<input bind:value={values.comment} disabled={pending} />
				</label>
				{#if error}
					<div class="message error">{error}</div>
				{/if}
			</div>
			<footer>
				<button class="btn" type="button" onclick={onCancel} disabled={pending}
					>{t('common.cancel')}</button
				>
				<button class="btn primary" type="submit" disabled={pending}>
					{pending ? pendingLabel : submitLabel}
				</button>
			</footer>
		</form>
	</div>
</div>
