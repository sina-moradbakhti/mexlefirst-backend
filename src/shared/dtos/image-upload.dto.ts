export class ImageResponseDto {
    readonly id: string;
    readonly url: string;
    readonly filename: string;
    readonly mimetype: string;
    readonly description? : string;
    readonly feedback?: string;
    readonly processingStatus?: string;
}