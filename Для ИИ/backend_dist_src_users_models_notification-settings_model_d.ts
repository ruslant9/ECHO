export declare class NotificationSettingsModel {
    id?: number;
    userId: number;
    muteAllUntil?: Date;
    notifyOnLikes?: boolean;
    notifyOnComments?: boolean;
    notifyOnReposts?: boolean;
    notifyOnMessages?: boolean;
    notifyOnFriendRequests?: boolean;
    notificationSound?: string;
}
