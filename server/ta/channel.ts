import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { config } from '../config';
import { taFetch } from './client';

export async function deleteChannel(id: string): Promise<void> {
    await taFetch(`channel/${encodeURIComponent(id)}`, "DELETE");
}

export async function uploadThumbnail(channelId: string, channelThumbBase64: string): Promise<string | undefined> {
    try {
        const dataUrl = channelThumbBase64;
        const match = dataUrl.match(/^data:\w+\/(\w+);base64,(.*)$/);
        const base64 = match ? match[2] : dataUrl;
        const destDir = join(config.cacheDir, 'channels');
        await mkdir(destDir, { recursive: true });
        const destPath = join(destDir, `${channelId}_thumb.jpg`);
        await writeFile(destPath, Buffer.from(base64, 'base64'));
        return `${config.taHost}/cache/channels/${channelId}_thumb.jpg`;
    } catch (err) {
        console.error('Failed to store channel thumbnail', err);
        return undefined;
    }
}
