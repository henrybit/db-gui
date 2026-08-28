<script lang="ts">
	import { workspace } from '$lib/stores/workspace.svelte';
	import { api, errorMessage } from '$lib/api/tauri';
	import { ENGINE_PRESETS, engineLabel, normalizeEngine, type EngineKind } from '$lib/engine';
	import type { ConnectionProfile } from '$lib/api/types';

	let profile = $state<ConnectionProfile>(
		workspace.editingConnection ?? {
			id: '',
			name: ENGINE_PRESETS.mysql.name,
			engine: 'mysql',
			host: '127.0.0.1',
			port: ENGINE_PRESETS.mysql.port,
			username: ENGINE_PRESETS.mysql.username,
			password: '',
			database: ENGINE_PRESETS.mysql.database,
			savePassword: true
		}
	);
	let testing = $state(false);
	let testMessage = $state<string | null>(null);
	const engine = $derived(normalizeEngine(profile.engine));
	const databaseHint = $derived(
		engine === 'postgres' ? 'database to connect (default postgres)' : 'optional'
	);

	function applyEngine(next: EngineKind) {
		const previous = ENGINE_PRESETS[normalizeEngine(profile.engine)];
		const preset = ENGINE_PRESETS[next];
		if (profile.port === previous.port) profile.port = preset.port;
		if (profile.username === previous.username) profile.username = preset.username;
		if (!profile.database || profile.database === previous.database) {
			profile.database = preset.database;
		}
		if (profile.name === previous.name || profile.name === 'MySQL' || profile.name === 'PostgreSQL') {
			profile.name = preset.name;
		}
		profile.engine = next;
	}

	async function test() {
		testing = true;
		testMessage = null;
		try {
			await api.testConnection({
				engine: profile.engine,
				host: profile.host,
				port: Number(profile.port) || ENGINE_PRESETS[engine].port,
				username: profile.username,
				password: profile.password,
				database: profile.database
			});
			testMessage = 'Connection succeeded';
		} catch (error) {
			testMessage = errorMessage(error);
		} finally {
			testing = false;
		}
	}

	function save() {
		void workspace.saveConnection({
			...profile,
			port: Number(profile.port) || ENGINE_PRESETS[engine].port,
			engine
		});
	}
</script>

<div class="modal-backdrop">
	<div class="modal" role="dialog" aria-modal="true">
		<header>{engineLabel(engine)} Connection</header>
		<div class="body">
			<label class="field">
				<span>Engine</span>
				<select
					value={engine}
					onchange={(event) => applyEngine(normalizeEngine(event.currentTarget.value))}
				>
					<option value="mysql">MySQL</option>
					<option value="postgres">PostgreSQL</option>
				</select>
			</label>
			<label class="field">
				<span>Name</span>
				<input bind:value={profile.name} />
			</label>
			<label class="field">
				<span>Host</span>
				<input bind:value={profile.host} />
			</label>
			<label class="field">
				<span>Port</span>
				<input type="number" bind:value={profile.port} />
			</label>
			<label class="field">
				<span>User</span>
				<input bind:value={profile.username} />
			</label>
			<label class="field">
				<span>Password</span>
				<input type="password" bind:value={profile.password} />
			</label>
			<label class="field">
				<span>Database</span>
				<input bind:value={profile.database} placeholder={databaseHint} />
			</label>
			<label class="field">
				<span>Save password</span>
				<input type="checkbox" bind:checked={profile.savePassword} />
			</label>
			{#if testMessage}
				<div class="message" class:error={!testMessage.includes('succeeded')}>{testMessage}</div>
			{/if}
		</div>
		<footer>
			<button class="btn" onclick={test} disabled={testing}>{testing ? 'Testing…' : 'Test Connection'}</button>
			<button class="btn" onclick={() => (workspace.dialogOpen = false)}>Cancel</button>
			<button class="btn primary" onclick={save} disabled={workspace.isPending('save-connection')}>Save</button>
		</footer>
	</div>
</div>
