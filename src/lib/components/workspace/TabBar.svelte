<script lang="ts">
	import { X } from '@lucide/svelte';
	import { t } from '$lib/i18n/i18n.svelte';
	import { workspace } from '$lib/stores/workspace.svelte';
</script>

{#if workspace.tabs.length > 0}
	<div class="tabbar">
		{#each workspace.tabs as tab (tab.id)}
			<div
				class="tab"
				class:active={workspace.activeTabId === tab.id}
				onclick={() => (workspace.activeTabId = tab.id)}
				onkeydown={(event) => event.key === 'Enter' && (workspace.activeTabId = tab.id)}
				role="tab"
				tabindex="0"
				aria-selected={workspace.activeTabId === tab.id}
			>
				<span class="truncate">{tab.title}</span>
				<button
					class="tab-close"
					type="button"
					onclick={(event) => {
						event.stopPropagation();
						workspace.closeTab(tab.id);
					}}
					aria-label={t('tab.close')}
				>
					<X size={12} />
				</button>
			</div>
		{/each}
	</div>
{/if}
