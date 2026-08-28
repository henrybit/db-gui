<script lang="ts">
	import { Database, Plus } from '@lucide/svelte';
	import { workspace } from '$lib/stores/workspace.svelte';
</script>

<div class="welcome">
	<div style="text-align:center;max-width:420px">
		<div style="display:flex;justify-content:center;margin-bottom:12px;color:var(--accent)">
			<Database size={42} />
		</div>
		<h1 style="margin:0 0 8px;font-size:22px;color:var(--text)">DB GUI</h1>
		<p style="margin:0 0 18px;line-height:1.6">
			Navicat-style manager for MySQL and PostgreSQL. Create a connection, browse tables, views,
			indexes, triggers and functions, then inspect data or run SQL.
		</p>
		<button class="btn primary" style="display:inline-flex;align-items:center;gap:6px" onclick={() => workspace.openNewConnection()}>
			<Plus size={14} />
			New Connection
		</button>
	</div>
</div>
