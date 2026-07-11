export interface Config {
    port: number;
    dataDir: string;
    cacheDir: string;
    taHost: string;
    apiToken: string;
    esUrl: string;
    esUser: string;
    esPassword: string;
}

function required(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

function optional(name: string, fallback: string): string {
    const value = process.env[name];
    return !value ? fallback : value;
}

export const config: Config = {
    port: Number.parseInt(optional("PORT", "9000"), 10),
    dataDir: optional("DATA_DIR", "/youtube"),
    cacheDir: optional("CACHE_DIR", "/cache"),
    taHost: required("TA_HOST"),
    apiToken: required("API_TOKEN"),
    esUrl: required("ES_URL"),
    esUser: optional("ELASTIC_USER", "elastic"),
    esPassword: required("ELASTIC_PASSWORD"),
};
