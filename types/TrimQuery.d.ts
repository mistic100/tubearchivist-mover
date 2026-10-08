export interface TrimQuery {
    videoId: string;
    action: 'trim' | 'validate' | 'cancel';
    start?: string; // hh:mm:ss
    end?: string; // hh:mm:ss
}
