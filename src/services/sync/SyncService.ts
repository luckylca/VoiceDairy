import { loadSnapshot } from '../database/Database';

export async function buildJsonSnapshot(): Promise<string> {
  const snapshot = await loadSnapshot();
  return JSON.stringify(
    {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      data: snapshot,
    },
    null,
    2,
  );
}
