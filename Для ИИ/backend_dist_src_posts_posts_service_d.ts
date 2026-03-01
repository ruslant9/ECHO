import { PrismaService } from '../prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { CreatePostInput } from './dto/create-post.input';
import { UpdatePostInput } from './dto/update-post.input';
import { CommentsService } from './comments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { FeedItem } from './models/feed-item.model';
export declare class PostsService {
    private prisma;
    private eventsGateway;
    private commentsService;
    private notificationsService;
    constructor(prisma: PrismaService, eventsGateway: EventsGateway, commentsService: CommentsService, notificationsService: NotificationsService);
    private getPostContentSnippet;
    private _attachLikedStatusToPost;
    create(userId: number, input: CreatePostInput): Promise<{
        author: {
            id: number;
            email: string;
            username: string;
            name: string;
            password: string;
            isOnline: boolean;
            lastOnlineAt: Date;
            isAdmin: boolean;
            isVerified: boolean;
            createdAt: Date;
            bio: string;
            location: string;
            gender: string;
            website: string;
            avatar: string;
            banner: string;
        };
        poll: {
            options: {
                id: number;
                text: string;
                pollId: number;
            }[];
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            postId: number;
            isAnonymous: boolean;
            question: string;
            endDate: Date;
            allowMultipleVotes: boolean;
            allowRevote: boolean;
        };
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        content: string | null;
        images: string[];
        commentsDisabled: boolean;
        isPinned: boolean;
        isPublished: boolean;
        scheduledAt: Date | null;
        likesCount: number;
        repostsCount: number;
        commentsCount: number;
        authorId: number;
        vibeId: number | null;
        originalPostId: number | null;
        repostedById: number | null;
    }>;
    update(userId: number, postId: number, input: UpdatePostInput): Promise<{
        author: {
            id: number;
            email: string;
            username: string;
            name: string;
            password: string;
            isOnline: boolean;
            lastOnlineAt: Date;
            isAdmin: boolean;
            isVerified: boolean;
            createdAt: Date;
            bio: string;
            location: string;
            gender: string;
            website: string;
            avatar: string;
            banner: string;
        };
        poll: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            postId: number;
            isAnonymous: boolean;
            question: string;
            endDate: Date;
            allowMultipleVotes: boolean;
            allowRevote: boolean;
        };
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        content: string | null;
        images: string[];
        commentsDisabled: boolean;
        isPinned: boolean;
        isPublished: boolean;
        scheduledAt: Date | null;
        likesCount: number;
        repostsCount: number;
        commentsCount: number;
        authorId: number;
        vibeId: number | null;
        originalPostId: number | null;
        repostedById: number | null;
    }>;
    findAll(sort?: 'new' | 'popular'): Promise<({
        author: {
            id: number;
            email: string;
            username: string;
            name: string;
            password: string;
            isOnline: boolean;
            lastOnlineAt: Date;
            isAdmin: boolean;
            isVerified: boolean;
            createdAt: Date;
            bio: string;
            location: string;
            gender: string;
            website: string;
            avatar: string;
            banner: string;
        };
        poll: {
            votes: {
                userId: number;
                pollId: number;
                pollOptionId: number;
            }[];
            options: {
                id: number;
                text: string;
                pollId: number;
            }[];
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            postId: number;
            isAnonymous: boolean;
            question: string;
            endDate: Date;
            allowMultipleVotes: boolean;
            allowRevote: boolean;
        };
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        content: string | null;
        images: string[];
        commentsDisabled: boolean;
        isPinned: boolean;
        isPublished: boolean;
        scheduledAt: Date | null;
        likesCount: number;
        repostsCount: number;
        commentsCount: number;
        authorId: number;
        vibeId: number | null;
        originalPostId: number | null;
        repostedById: number | null;
    })[]>;
    findOne(id: number, viewerId?: number): Promise<{
        author: {
            id: number;
            email: string;
            username: string;
            name: string;
            password: string;
            isOnline: boolean;
            lastOnlineAt: Date;
            isAdmin: boolean;
            isVerified: boolean;
            createdAt: Date;
            bio: string;
            location: string;
            gender: string;
            website: string;
            avatar: string;
            banner: string;
        };
        originalPost: {
            author: {
                id: number;
                email: string;
                username: string;
                name: string;
                password: string;
                isOnline: boolean;
                lastOnlineAt: Date;
                isAdmin: boolean;
                isVerified: boolean;
                createdAt: Date;
                bio: string;
                location: string;
                gender: string;
                website: string;
                avatar: string;
                banner: string;
            };
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            content: string | null;
            images: string[];
            commentsDisabled: boolean;
            isPinned: boolean;
            isPublished: boolean;
            scheduledAt: Date | null;
            likesCount: number;
            repostsCount: number;
            commentsCount: number;
            authorId: number;
            vibeId: number | null;
            originalPostId: number | null;
            repostedById: number | null;
        };
        poll: {
            votes: {
                userId: number;
                pollId: number;
                pollOptionId: number;
            }[];
            options: {
                id: number;
                text: string;
                pollId: number;
            }[];
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            postId: number;
            isAnonymous: boolean;
            question: string;
            endDate: Date;
            allowMultipleVotes: boolean;
            allowRevote: boolean;
        };
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        content: string | null;
        images: string[];
        commentsDisabled: boolean;
        isPinned: boolean;
        isPublished: boolean;
        scheduledAt: Date | null;
        likesCount: number;
        repostsCount: number;
        commentsCount: number;
        authorId: number;
        vibeId: number | null;
        originalPostId: number | null;
        repostedById: number | null;
    } & {
        isLikedByUser: boolean;
    }>;
    toggleLike(postId: number, userId: number): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        content: string | null;
        images: string[];
        commentsDisabled: boolean;
        isPinned: boolean;
        isPublished: boolean;
        scheduledAt: Date | null;
        likesCount: number;
        repostsCount: number;
        commentsCount: number;
        authorId: number;
        vibeId: number | null;
        originalPostId: number | null;
        repostedById: number | null;
    }>;
    repost(userId: number, postId: number): Promise<{
        author: {
            id: number;
            email: string;
            username: string;
            name: string;
            password: string;
            isOnline: boolean;
            lastOnlineAt: Date;
            isAdmin: boolean;
            isVerified: boolean;
            createdAt: Date;
            bio: string;
            location: string;
            gender: string;
            website: string;
            avatar: string;
            banner: string;
        };
        originalPost: {
            author: {
                id: number;
                email: string;
                username: string;
                name: string;
                password: string;
                isOnline: boolean;
                lastOnlineAt: Date;
                isAdmin: boolean;
                isVerified: boolean;
                createdAt: Date;
                bio: string;
                location: string;
                gender: string;
                website: string;
                avatar: string;
                banner: string;
            };
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            content: string | null;
            images: string[];
            commentsDisabled: boolean;
            isPinned: boolean;
            isPublished: boolean;
            scheduledAt: Date | null;
            likesCount: number;
            repostsCount: number;
            commentsCount: number;
            authorId: number;
            vibeId: number | null;
            originalPostId: number | null;
            repostedById: number | null;
        };
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        content: string | null;
        images: string[];
        commentsDisabled: boolean;
        isPinned: boolean;
        isPublished: boolean;
        scheduledAt: Date | null;
        likesCount: number;
        repostsCount: number;
        commentsCount: number;
        authorId: number;
        vibeId: number | null;
        originalPostId: number | null;
        repostedById: number | null;
    }>;
    getRecommendationFeed(userId: number): Promise<FeedItem[]>;
    togglePin(userId: number, postId: number): Promise<boolean>;
    getPostLikes(postId: number): Promise<{
        id: number;
        email: string;
        username: string;
        name: string;
        password: string;
        isOnline: boolean;
        lastOnlineAt: Date;
        isAdmin: boolean;
        isVerified: boolean;
        createdAt: Date;
        bio: string;
        location: string;
        gender: string;
        website: string;
        avatar: string;
        banner: string;
    }[]>;
    getPostReposters(postId: number): Promise<{
        id: number;
        email: string;
        username: string;
        name: string;
        password: string;
        isOnline: boolean;
        lastOnlineAt: Date;
        isAdmin: boolean;
        isVerified: boolean;
        createdAt: Date;
        bio: string;
        location: string;
        gender: string;
        website: string;
        avatar: string;
        banner: string;
    }[]>;
    delete(postId: number, userId: number): Promise<boolean>;
    togglePollVote(userId: number, pollId: number, optionIds: number[]): Promise<{
        options: {
            votesCount: number;
            id: number;
            text: string;
            pollId: number;
        }[];
        votes: {
            userId: number;
            pollId: number;
            pollOptionId: number;
        }[];
        id: number;
        createdAt: Date;
        updatedAt: Date;
        postId: number;
        isAnonymous: boolean;
        question: string;
        endDate: Date;
        allowMultipleVotes: boolean;
        allowRevote: boolean;
    }>;
    getPollVoters(userId: number, pollId: number): Promise<{
        optionId: number;
        user: {
            id: number;
            email: string;
            username: string;
            name: string;
            password: string;
            isOnline: boolean;
            lastOnlineAt: Date;
            isAdmin: boolean;
            isVerified: boolean;
            createdAt: Date;
            bio: string;
            location: string;
            gender: string;
            website: string;
            avatar: string;
            banner: string;
        };
    }[]>;
    getUserPollVotes(userId: number, pollId: number): Promise<{
        optionId: number;
    }[]>;
    getScheduledPosts(userId: number): Promise<({
        author: {
            id: number;
            email: string;
            username: string;
            name: string;
            password: string;
            isOnline: boolean;
            lastOnlineAt: Date;
            isAdmin: boolean;
            isVerified: boolean;
            createdAt: Date;
            bio: string;
            location: string;
            gender: string;
            website: string;
            avatar: string;
            banner: string;
        };
        poll: {
            options: {
                id: number;
                text: string;
                pollId: number;
            }[];
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            postId: number;
            isAnonymous: boolean;
            question: string;
            endDate: Date;
            allowMultipleVotes: boolean;
            allowRevote: boolean;
        };
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        content: string | null;
        images: string[];
        commentsDisabled: boolean;
        isPinned: boolean;
        isPublished: boolean;
        scheduledAt: Date | null;
        likesCount: number;
        repostsCount: number;
        commentsCount: number;
        authorId: number;
        vibeId: number | null;
        originalPostId: number | null;
        repostedById: number | null;
    })[]>;
    publishPost(userId: number, postId: number): Promise<{
        author: {
            id: number;
            email: string;
            username: string;
            name: string;
            password: string;
            isOnline: boolean;
            lastOnlineAt: Date;
            isAdmin: boolean;
            isVerified: boolean;
            createdAt: Date;
            bio: string;
            location: string;
            gender: string;
            website: string;
            avatar: string;
            banner: string;
        };
        poll: {
            options: {
                id: number;
                text: string;
                pollId: number;
            }[];
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            postId: number;
            isAnonymous: boolean;
            question: string;
            endDate: Date;
            allowMultipleVotes: boolean;
            allowRevote: boolean;
        };
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        content: string | null;
        images: string[];
        commentsDisabled: boolean;
        isPinned: boolean;
        isPublished: boolean;
        scheduledAt: Date | null;
        likesCount: number;
        repostsCount: number;
        commentsCount: number;
        authorId: number;
        vibeId: number | null;
        originalPostId: number | null;
        repostedById: number | null;
    }>;
}
