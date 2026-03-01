import { PollOption } from './poll-option.model';
export declare class Poll {
    id: number;
    question: string;
    endDate: Date;
    isAnonymous: boolean;
    allowMultipleVotes: boolean;
    options: PollOption[];
    postId: number;
    allowRevote: boolean;
}
