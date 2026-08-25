export function generateRandomId(length: number): string {
    const prefix = 'tam-';
    const randLen = Math.max(0, length - prefix.length);
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_';

    const randomValues = new Uint32Array(randLen);
    if (randLen > 0) crypto.getRandomValues(randomValues);

    let result = prefix;
    for (let i = 0; i < randLen; i++) {
        result += characters.charAt(randomValues[i] % characters.length);
    }
    return result;
}
