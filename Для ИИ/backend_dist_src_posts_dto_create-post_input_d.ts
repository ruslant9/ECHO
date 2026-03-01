import { CreatePollInput } from './create-poll.input';
export declare class CreatePostInput {
    content?: string;
    images?: string[];
    commentsDisabled?: boolean;
    poll?: CreatePollInput;
    scheduledAt?: Date;
}
