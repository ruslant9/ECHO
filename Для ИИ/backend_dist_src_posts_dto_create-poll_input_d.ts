import { CreatePollOptionInput } from './create-poll-option.input';
export declare class CreatePollInput {
    question: string;
    options: CreatePollOptionInput[];
    endDate: Date;
    isAnonymous: boolean;
    allowMultipleVotes: boolean;
    allowRevote: boolean;
}
