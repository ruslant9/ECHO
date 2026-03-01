export declare class ConversationStatsDay {
    date: string;
    total: number;
    sent: number;
    received: number;
}
export declare class ConversationStats {
    totalMessages: number;
    sentCount: number;
    receivedCount: number;
    totalReactions: number;
    sentReactions: number;
    receivedReactions: number;
    pinnedMessagesCount: number;
    firstMessageAt?: Date;
    lastMessageAt?: Date;
    daily: ConversationStatsDay[];
}
