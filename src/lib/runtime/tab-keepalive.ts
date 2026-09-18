/** Keep a tab mounted after first activation; drop ids that are no longer open. */
export function nextMountedTabIds(
	mounted: ReadonlySet<string>,
	openIds: ReadonlySet<string>,
	activeId: string | null
): Set<string> {
	const next = new Set<string>();
	for (const id of mounted) {
		if (openIds.has(id)) next.add(id);
	}
	if (activeId && openIds.has(activeId)) next.add(activeId);
	return next;
}

/** Oversized query SQL is spilled to disk; unmount those editors while inactive. */
export function shouldRenderMountedTab(
	tab: { kind: string; sqlCached?: boolean },
	active: boolean
): boolean {
	return active || tab.kind !== 'query' || !tab.sqlCached;
}

export function sameStringSet(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
	if (a.size !== b.size) return false;
	for (const id of a) {
		if (!b.has(id)) return false;
	}
	return true;
}
