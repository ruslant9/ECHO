export declare class Session {
    id: number;
    ip: string;
    city?: string;
    device?: string;
    os?: string;
    browser?: string;
    lastActive: Date;
    isCurrent?: boolean;
}
