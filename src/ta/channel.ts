import { taFetch } from './client';

export async function deleteChannel(id: string): Promise<void> {
    await taFetch(`channel/${encodeURIComponent(id)}`, "DELETE");
}
