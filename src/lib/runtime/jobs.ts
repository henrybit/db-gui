const latest = new Map<string, number>();
let nextId = 0;

export function afterPaint(): Promise<void> {
	return new Promise((resolve) => {
		if (typeof requestAnimationFrame === 'function') {
			requestAnimationFrame(() => resolve());
			return;
		}
		setTimeout(resolve, 0);
	});
}

/** Keep only the latest in-flight request per key so stale query results cannot clobber the UI. */
export async function runExclusive<T>(key: string, work: () => Promise<T>): Promise<T | undefined> {
	const id = ++nextId;
	latest.set(key, id);
	try {
		const result = await work();
		if (latest.get(key) !== id) return undefined;
		return result;
	} catch (error) {
		if (latest.get(key) !== id) return undefined;
		throw error;
	}
}
