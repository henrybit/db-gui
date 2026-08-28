import { api, errorMessage, isTauriRuntime } from '$lib/api/tauri';
import { qualifyIdent } from '$lib/engine';
import { uid } from '$lib/format';
import { afterPaint, runExclusive } from '$lib/runtime/jobs';
import type {
	ConnectionListItem,
	ConnectionProfile,
	ContextMenuAction,
	ContextMenuState,
	DatabaseInfo,
	FolderKind,
	IndexInfo,
	ObjectKind,
	QueryResult,
	RoutineInfo,
	Tab,
	TableInfo,
	TreeSelection,
	TriggerInfo,
	ViewInfo
} from '$lib/api/types';

export interface SchemaCache {
	databases: DatabaseInfo[];
	tables: Record<string, TableInfo[]>;
	views: Record<string, ViewInfo[]>;
	indexes: Record<string, IndexInfo[]>;
	triggers: Record<string, TriggerInfo[]>;
	routines: Record<string, RoutineInfo[]>;
}

function emptyCache(): SchemaCache {
	return { databases: [], tables: {}, views: {}, indexes: {}, triggers: {}, routines: {} };
}

class WorkspaceStore {
	connections = $state<ConnectionListItem[]>([]);
	expanded = $state<Set<string>>(new Set());
	schema = $state<Record<string, SchemaCache>>({});
	selection = $state<TreeSelection | null>(null);
	tabs = $state<Tab[]>([]);
	activeTabId = $state<string | null>(null);
	status = $state('Ready');
	error = $state<string | null>(null);
	pending = $state<Set<string>>(new Set());
	dialogOpen = $state(false);
	editingConnection = $state<ConnectionProfile | null>(null);
	passwordPrompt = $state<{ id: string; name: string } | null>(null);
	confirmDelete = $state<{ id: string; name: string } | null>(null);
	contextMenu = $state<ContextMenuState | null>(null);
	queryResults = $state<Record<string, QueryResult | null>>({});
	lastMessage = $state<string | null>(null);

	get activeTab(): Tab | null {
		return this.tabs.find((tab) => tab.id === this.activeTabId) ?? null;
	}

	get busy(): boolean {
		return this.pending.size > 0;
	}

	isPending(key: string): boolean {
		return this.pending.has(key);
	}

	private begin(key: string) {
		const next = new Set(this.pending);
		next.add(key);
		this.pending = next;
	}

	private end(key: string) {
		const next = new Set(this.pending);
		next.delete(key);
		this.pending = next;
	}

	async boot() {
		if (!isTauriRuntime()) {
			this.status = 'Run `pnpm tauri dev` to connect to a database';
			return;
		}
		try {
			this.connections = await api.listConnections();
			this.status = `${this.connections.length} saved connection(s)`;
		} catch (error) {
			this.error = errorMessage(error);
		}
	}

	openNewConnection() {
		this.editingConnection = {
			id: '',
			name: 'MySQL',
			engine: 'mysql',
			host: '127.0.0.1',
			port: 3306,
			username: 'root',
			password: '',
			database: '',
			savePassword: true
		};
		this.dialogOpen = true;
		this.closeMenu();
	}

	openEditConnection(id: string) {
		const item = this.connections.find((c) => c.id === id);
		if (!item) return;
		this.editingConnection = {
			id: item.id,
			name: item.name,
			engine: item.engine,
			host: item.host,
			port: item.port,
			username: item.username,
			password: item.password ?? '',
			database: item.database ?? '',
			savePassword: item.savePassword
		};
		this.dialogOpen = true;
		this.closeMenu();
	}

	async saveConnection(profile: ConnectionProfile) {
		const key = 'save-connection';
		this.begin(key);
		this.error = null;
		try {
			await api.upsertConnection(profile);
			await this.boot();
			this.dialogOpen = false;
			this.status = `Saved ${profile.name}`;
		} catch (error) {
			this.error = errorMessage(error);
		} finally {
			this.end(key);
		}
	}

	askDeleteConnection(id: string) {
		const item = this.connections.find((c) => c.id === id);
		if (!item) return;
		this.confirmDelete = { id, name: item.name };
		this.closeMenu();
	}

	async confirmDeleteConnection() {
		if (!this.confirmDelete) return;
		const key = `delete:${this.confirmDelete.id}`;
		this.begin(key);
		try {
			await api.deleteConnection(this.confirmDelete.id);
			this.tabs = this.tabs.filter((tab) => tab.connectionId !== this.confirmDelete?.id);
			if (this.selection?.connectionId === this.confirmDelete.id) this.selection = null;
			this.confirmDelete = null;
			await this.boot();
		} catch (error) {
			this.error = errorMessage(error);
		} finally {
			this.end(key);
		}
	}

	connect(id: string, password?: string) {
		void this.connectInBackground(id, password);
	}

	private async connectInBackground(id: string, password?: string) {
		const key = `connect:${id}`;
		this.begin(key);
		this.error = null;
		try {
			await afterPaint();
			await api.connect(id, password);
			this.passwordPrompt = null;
			await this.boot();
			this.expanded = new Set([...this.expanded, `conn:${id}`]);
			void this.loadDatabases(id);
			this.status = 'Connected';
		} catch (error) {
			const message = errorMessage(error);
			const item = this.connections.find((c) => c.id === id);
			if (message.toLowerCase().includes('access denied') || !item?.password) {
				this.passwordPrompt = { id, name: item?.name ?? id };
			}
			this.error = message;
		} finally {
			this.end(key);
		}
	}

	disconnect(id: string) {
		void this.disconnectInBackground(id);
	}

	private async disconnectInBackground(id: string) {
		const key = `disconnect:${id}`;
		this.begin(key);
		try {
			await afterPaint();
			await api.disconnect(id);
			delete this.schema[id];
			this.schema = { ...this.schema };
			await this.boot();
			this.status = 'Disconnected';
		} catch (error) {
			this.error = errorMessage(error);
		} finally {
			this.end(key);
		}
	}

	toggleExpanded(key: string) {
		const next = new Set(this.expanded);
		if (next.has(key)) next.delete(key);
		else next.add(key);
		this.expanded = next;
	}

	selectConnection(id: string) {
		this.selection = { connectionId: id };
		const item = this.connections.find((c) => c.id === id);
		if (item?.connected) {
			this.expanded = new Set([...this.expanded, `conn:${id}`]);
			void this.loadDatabases(id);
		}
	}

	selectDatabase(connectionId: string, schema: string) {
		this.selection = { connectionId, schema };
		this.expanded = new Set([...this.expanded, `conn:${connectionId}`, `db:${connectionId}:${schema}`]);
		this.openObjectsTab(connectionId, schema, 'tables');
		void this.ensureFolder(connectionId, schema, 'tables');
	}

	selectFolder(connectionId: string, schema: string, folder: FolderKind) {
		this.selection = { connectionId, schema, folder };
		this.openObjectsTab(connectionId, schema, folder);
		void this.ensureFolder(connectionId, schema, folder);
	}

	selectObject(
		connectionId: string,
		schema: string,
		folder: FolderKind,
		objectKind: ObjectKind,
		objectName: string
	) {
		this.selection = { connectionId, schema, folder, objectKind, objectName };
	}

	openObjectsTab(connectionId: string, schema: string, folder: FolderKind) {
		const id = `objects:${connectionId}:${schema}:${folder}`;
		const existing = this.tabs.find((tab) => tab.id === id);
		if (!existing) {
			this.tabs = [
				...this.tabs,
				{
					id,
					kind: 'objects',
					title: `${schema} / ${folderLabel(folder)}`,
					connectionId,
					schema,
					objectKind: folderToKind(folder),
					folder
				}
			];
		}
		this.activeTabId = id;
	}

	openTable(connectionId: string, schema: string, name: string, view = false) {
		const id = `${view ? 'view' : 'table'}:${connectionId}:${schema}:${name}`;
		if (!this.tabs.some((tab) => tab.id === id)) {
			this.tabs = [
				...this.tabs,
				{
					id,
					kind: view ? 'view' : 'table',
					title: name,
					connectionId,
					schema,
					objectName: name,
					objectKind: view ? 'view' : 'table'
				}
			];
		}
		this.activeTabId = id;
		this.closeMenu();
	}

	openDdl(connectionId: string, schema: string, kind: ObjectKind, name: string) {
		const id = `ddl:${connectionId}:${schema}:${kind}:${name}`;
		if (!this.tabs.some((tab) => tab.id === id)) {
			this.tabs = [
				...this.tabs,
				{
					id,
					kind: 'ddl',
					title: name,
					connectionId,
					schema,
					objectName: name,
					objectKind: kind
				}
			];
		}
		this.activeTabId = id;
		this.closeMenu();
	}

	openQuery(connectionId: string, schema?: string, seedSql?: string) {
		const id = uid('query');
		const connection = this.connections.find((item) => item.id === connectionId);
		this.tabs = [
			...this.tabs,
			{
				id,
				kind: 'query',
				title: schema ? `Query @ ${schema}` : `Query @ ${connection?.name ?? 'database'}`,
				connectionId,
				schema,
				sql: seedSql ?? (schema ? `SELECT * FROM ${qualifyIdent(connection?.engine, schema)}` : 'SELECT 1;')
			}
		];
		this.activeTabId = id;
		this.closeMenu();
	}

	closeTab(id: string) {
		const index = this.tabs.findIndex((tab) => tab.id === id);
		this.tabs = this.tabs.filter((tab) => tab.id !== id);
		delete this.queryResults[id];
		this.queryResults = { ...this.queryResults };
		if (this.activeTabId === id) {
			this.activeTabId = this.tabs[index]?.id ?? this.tabs[index - 1]?.id ?? null;
		}
	}

	setTabSql(id: string, sql: string) {
		this.tabs = this.tabs.map((tab) => (tab.id === id ? { ...tab, sql } : tab));
	}

	async loadDatabases(connectionId: string) {
		const key = `db:${connectionId}`;
		this.begin(key);
		try {
			await afterPaint();
			const databases = await runExclusive(key, () => api.listDatabases(connectionId));
			if (!databases) return;
			const current = this.schema[connectionId] ?? emptyCache();
			this.schema = { ...this.schema, [connectionId]: { ...current, databases } };
		} catch (error) {
			this.error = errorMessage(error);
		} finally {
			this.end(key);
		}
	}

	folderJobKey(connectionId: string, schema: string, folder: FolderKind) {
		return `folder:${connectionId}:${schema}:${folder}`;
	}

	async ensureFolder(connectionId: string, schema: string, folder: FolderKind) {
		const cached = this.schema[connectionId];
		if (
			(folder === 'tables' && cached?.tables[schema]) ||
			(folder === 'views' && cached?.views[schema]) ||
			(folder === 'indexes' && cached?.indexes[schema]) ||
			(folder === 'triggers' && cached?.triggers[schema]) ||
			(folder === 'functions' && cached?.routines[schema])
		) {
			return;
		}

		const key = this.folderJobKey(connectionId, schema, folder);
		this.begin(key);
		try {
			await afterPaint();
			const result = await runExclusive(key, async () => {
				switch (folder) {
					case 'tables':
						return { kind: 'tables' as const, items: await api.listTables(connectionId, schema) };
					case 'views':
						return { kind: 'views' as const, items: await api.listViews(connectionId, schema) };
					case 'indexes':
						return { kind: 'indexes' as const, items: await api.listIndexes(connectionId, schema) };
					case 'triggers':
						return { kind: 'triggers' as const, items: await api.listTriggers(connectionId, schema) };
					case 'functions':
						return { kind: 'functions' as const, items: await api.listRoutines(connectionId, schema) };
				}
			});
			if (!result) return;
			const current = this.schema[connectionId] ?? emptyCache();
			const next = { ...current };
			if (result.kind === 'tables') next.tables = { ...current.tables, [schema]: result.items };
			if (result.kind === 'views') next.views = { ...current.views, [schema]: result.items };
			if (result.kind === 'indexes') next.indexes = { ...current.indexes, [schema]: result.items };
			if (result.kind === 'triggers') next.triggers = { ...current.triggers, [schema]: result.items };
			if (result.kind === 'functions') next.routines = { ...current.routines, [schema]: result.items };
			this.schema = { ...this.schema, [connectionId]: next };
		} catch (error) {
			this.error = errorMessage(error);
		} finally {
			this.end(key);
		}
	}

	refresh(connectionId: string, schema?: string) {
		this.closeMenu();
		void this.refreshInBackground(connectionId, schema);
	}

	private async refreshInBackground(connectionId: string, schema?: string) {
		const key = `refresh:${connectionId}:${schema ?? ''}`;
		this.begin(key);
		this.error = null;
		try {
			await afterPaint();
			await this.loadDatabases(connectionId);
			if (schema) {
				const [tables, views, indexes, triggers, routines] = await Promise.all([
					api.listTables(connectionId, schema),
					api.listViews(connectionId, schema),
					api.listIndexes(connectionId, schema),
					api.listTriggers(connectionId, schema),
					api.listRoutines(connectionId, schema)
				]);
				const current = this.schema[connectionId] ?? emptyCache();
				this.schema = {
					...this.schema,
					[connectionId]: {
						...current,
						tables: { ...current.tables, [schema]: tables },
						views: { ...current.views, [schema]: views },
						indexes: { ...current.indexes, [schema]: indexes },
						triggers: { ...current.triggers, [schema]: triggers },
						routines: { ...current.routines, [schema]: routines }
					}
				};
			}
			this.status = 'Refreshed';
		} catch (error) {
			this.error = errorMessage(error);
		} finally {
			this.end(key);
		}
	}

	openMenu(event: MouseEvent, payload: Omit<ContextMenuState, 'x' | 'y' | 'actions'> & { actions: ContextMenuAction[] }) {
		event.preventDefault();
		event.stopPropagation();
		this.contextMenu = { x: event.clientX, y: event.clientY, ...payload };
	}

	closeMenu() {
		this.contextMenu = null;
	}

	setQueryResult(tabId: string, result: QueryResult | null, message?: string) {
		this.queryResults = { ...this.queryResults, [tabId]: result };
		if (message) this.lastMessage = message;
	}
}

export function folderLabel(folder: FolderKind): string {
	switch (folder) {
		case 'tables':
			return 'Tables';
		case 'views':
			return 'Views';
		case 'indexes':
			return 'Indexes';
		case 'triggers':
			return 'Triggers';
		case 'functions':
			return 'Functions';
	}
}

export function folderToKind(folder: FolderKind): ObjectKind {
	switch (folder) {
		case 'tables':
			return 'table';
		case 'views':
			return 'view';
		case 'indexes':
			return 'index';
		case 'triggers':
			return 'trigger';
		case 'functions':
			return 'function';
	}
}

export const workspace = new WorkspaceStore();
