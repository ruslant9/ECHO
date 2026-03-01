import { Post } from './models/post.model';
import { PostsService } from './posts.service';
import { CommentsService } from './comments.service';
import { CreatePostInput } from './dto/create-post.input';
import { UpdatePostInput } from './dto/update-post.input';
import { PollOption } from './models/poll-option.model';
import { FeedItem } from './models/feed-item.model';
export declare class PostsResolver {
    private postsService;
    private commentsService;
    constructor(postsService: PostsService, commentsService: CommentsService);
    poll(post: Post): Promise<{
        options: {
            votesCount: number;
            votes: {
                userId: number;
                pollId: number;
                pollOptionId: number;
            }[];
            id: number;
            text: string;
            pollId: number;
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
    votesCount(pollOption: PollOption): Promise<number>;
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
    getCommentLikes(commentId: number): Promise<{
        id: number;
        email: string;
        username: string;
        name: string;
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
    findAllPosts(sort: 'new' | 'popular'): Promise<({
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
    findOnePost(id: number, context: any): Promise<{
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
    createPost(createPostInput: CreatePostInput, context: any): Promise<{
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
    myScheduledPosts(context: any): Promise<{
        isLikedByUser: boolean;
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
    }[]>;
    publishPostNow(postId: number, context: any): Promise<{
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
    togglePostLike(postId: number, context: any): Promise<{
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
    updatePost(postId: number, updatePostInput: UpdatePostInput, context: any): Promise<{
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
    deletePost(postId: number, context: any): boolean;
    findCommentsByPost(postId: number, sort: 'new' | 'popular', context: any): Promise<({
        author: {
            id: number;
            email: string;
            username: string;
            name: string;
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
        replies: ({
            author: {
                id: number;
                email: string;
                username: string;
                name: string;
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
            content: string;
            likesCount: number;
            authorId: number;
            postId: number;
            dislikesCount: number;
            score: number;
            parentId: number | null;
        })[];
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        likesCount: number;
        authorId: number;
        postId: number;
        dislikesCount: number;
        score: number;
        parentId: number | null;
    })[]>;
    createComment(postId: number, content: string, parentId: number, context: any): Promise<{
        author: {
            id: number;
            email: string;
            username: string;
            name: string;
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
        content: string;
        likesCount: number;
        authorId: number;
        postId: number;
        dislikesCount: number;
        score: number;
        parentId: number | null;
    }>;
    voteComment(commentId: number, type: 'LIKE' | 'DISLIKE', context: any): Promise<{
        userVote: import(".prisma/client").$Enums.VoteType;
        author: {
            id: number;
            email: string;
            username: string;
            name: string;
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
        id: number;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        likesCount: number;
        authorId: number;
        postId: number;
        dislikesCount: number;
        score: number;
        parentId: number | null;
    }>;
    deleteManyComments(commentIds: number[], context: any): Promise<number>;
    clearComments(postId: number, type: 'ALL' | 'MINE' | 'OTHERS', context: any): Promise<number>;
    updateComment(commentId: number, content: string, context: any): Promise<{
        author: {
            id: number;
            email: string;
            username: string;
            name: string;
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
        content: string;
        likesCount: number;
        authorId: number;
        postId: number;
        dislikesCount: number;
        score: number;
        parentId: number | null;
    }>;
    recommendationFeed(context: any): Promise<FeedItem[]>;
    repostPost(postId: number, context: any): Promise<{
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
    togglePinPost(postId: number, context: any): Promise<boolean>;
    deleteComment(commentId: number, context: any): Promise<number>;
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
    togglePollVote(pollId: number, optionIds: number[], context: any): Promise<{
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
    getUserPollVotes(pollId: number, context: any): Promise<{
        optionId: number;
    }[]>;
    getPollVoters(pollId: number, context: any): Promise<{
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
}
