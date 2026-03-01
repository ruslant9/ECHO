import { CloudinaryService } from './cloudinary.service';
import { Response, Request } from 'express';
export declare class UploadController {
    private readonly cloudinaryService;
    constructor(cloudinaryService: CloudinaryService);
    streamAudio(filename: string, req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    uploadAvatar(file: Express.Multer.File): Promise<{
        url: string;
        filename: string;
    }>;
    uploadMessageImage(file: Express.Multer.File): Promise<{
        url: string;
        filename: string;
    }>;
    uploadAudio(file: Express.Multer.File): Promise<{
        url: string;
    }>;
    uploadVideo(file: Express.Multer.File): Promise<{
        url: string;
    }>;
}
