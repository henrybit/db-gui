const MAX_SQL_FILE_BYTES = 8 * 1024 * 1024;

export type PickedSqlFile = {
	name: string;
	content: string;
};

export function pickSqlFile(): Promise<PickedSqlFile | null> {
	return new Promise((resolve, reject) => {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.sql,text/plain,text/sql';
		input.style.display = 'none';

		const cleanup = () => {
			input.remove();
		};

		input.addEventListener('change', () => {
			const file = input.files?.[0];
			cleanup();
			if (!file) {
				resolve(null);
				return;
			}
			if (file.size > MAX_SQL_FILE_BYTES) {
				reject(new Error(`SQL file is too large (max ${MAX_SQL_FILE_BYTES / (1024 * 1024)} MB)`));
				return;
			}
			void file
				.text()
				.then((content) => resolve({ name: file.name, content }))
				.catch(reject);
		});

		input.addEventListener('cancel', () => {
			cleanup();
			resolve(null);
		});

		document.body.appendChild(input);
		input.click();
	});
}
