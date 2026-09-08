export const MAX_OPEN_SESSIONS = 5;

/** Oldest open session IDs that must close before `connectingId` can occupy a slot. */
export function idsToEvict(
	openOrder: readonly string[],
	connectingId: string,
	max = MAX_OPEN_SESSIONS
): string[] {
	if (openOrder.includes(connectingId)) return [];
	const keepExisting = Math.max(0, max - 1);
	return openOrder.slice(0, Math.max(0, openOrder.length - keepExisting));
}

export function forgetExpandedKeys(expanded: Iterable<string>, connectionId: string): Set<string> {
	return new Set(
		[...expanded].filter(
			(key) =>
				key !== `conn:${connectionId}` &&
				!key.startsWith(`db:${connectionId}:`) &&
				!key.startsWith(`folder:${connectionId}:`)
		)
	);
}

export function connectStatus(evictedNames: string[]): string {
	if (evictedNames.length === 0) return 'Connected';
	return `Connected · closed ${evictedNames.join(', ')} (max ${MAX_OPEN_SESSIONS} sessions)`;
}
