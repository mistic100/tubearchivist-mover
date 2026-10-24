import { Glob } from 'bun';
import { join } from 'node:path';
import { config } from '../config';

export async function listTempFiles(): Promise<string[]> {
    const glob = new Glob(`*/*.tmp.mp4`);

    const files = [];

    for await (const file of glob.scan(config.dataDir)) {
        files.push(file.replace('\\', '/'));
    }

    return files;
}

export async function deleteTempFile(filename: string): Promise<void> {
    console.log('Delete file', filename);

    if (!/^[a-z0-9_-]+\/[a-z0-9_-]+\.tmp\.mp4$/i.test(filename)) {
        throw new Error('Invalid request');
    }

    const filePath = join(config.dataDir, filename);
    
    const file = Bun.file(filePath);
    if (!(await file.exists())) {
        throw new Error('File not found');
    }

    await file.delete();
}
