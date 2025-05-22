export class ImagesResponseDto {
    images: {
        id: string;
        url: string;
        filename: string;
        mimetype: string;
        description: string;
        feedback: string;
        processingStatus: string;
    }[]
}