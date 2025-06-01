import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Image, ImageDocument } from '../schemas/image.schema';
import { Model } from 'mongoose';
import { ImageResponseDto } from 'src/shared/dtos/image-upload.dto';
import { UploadImageDto } from '../dtos/upload-image.dto';
import { ConfigService } from '@nestjs/config';
import { ObjectId } from 'mongodb';
import * as fs from 'fs';
import { ImageFilterDto } from 'src/shared/dto/image-filter.dto';
import { PaginatedResponse } from 'src/shared/dto/filter.dto';
import { Experiment, ExperimentDocument } from 'src/experiment/schemas/experiment.schema';
import { User, UserDocument } from 'src/user/schemas/user.schema';
import { AddFeedbackDto } from '../dtos/add-feedback.dto';
import { ImagesResponseDto } from 'src/shared/dtos/images-uploaded.dto';
import { ImageProcessingService } from './image-processing.service';

@Injectable()
export class ImageService {
    constructor(
        @InjectModel(Image.name) private imageModel: Model<ImageDocument>,
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        @InjectModel(Experiment.name) private experimentModel: Model<ExperimentDocument>,
        private configService: ConfigService,
        private imageProcessingService: ImageProcessingService,
    ) { }

    async findAll(filter: ImageFilterDto): Promise<PaginatedResponse<ImageDocument>> {
        const query = {};

        if (filter.user) {
            const targetedUser = await this.userModel.find({
                email: {
                    $regex: filter.user,
                    $options: 'i',
                },
                role: 'student',
            }).exec();

            if (targetedUser) {
                query['userId'] = {
                    $in: targetedUser.map(user => user._id),
                };
            }
        }

        if (
            filter.search &&
            filter.searchBy &&
            ['experimentId'].includes(filter.searchBy)
        ) {
            const expIds = await this.experimentModel.find({
                experimentId: {
                    $regex: filter.search,
                    $options: 'i',
                },
            })
                .exec();

            query['experimentId'] = {
                $in: expIds.map(exp => exp._id),
            };
        }

        const skip = (filter.page - 1) * filter.limit;

        const [items, total] = await Promise.all([
            this.imageModel
                .find(query)
                .populate('experimentId')
                .populate('userId')
                .skip(skip)
                .limit(filter.limit)
                .sort({ createdAt: -1 })
                .exec(),
            this.imageModel.countDocuments(query).exec(),
        ]);

        const pages = Math.ceil(total / filter.limit);

        return {
            data: items,
            total,
            page: filter.page,
            limit: filter.limit,
            pages,
        };

    }

    async uploadImage(file: Express.Multer.File, uploadImageDto: UploadImageDto): Promise<ImageResponseDto> {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        if (ObjectId.isValid(uploadImageDto.experimentId) === false) {
            throw new BadRequestException('Not valid experiment id');
        }

        const experiment = await this.experimentModel.findById(uploadImageDto.experimentId);
        if (!experiment) {
            throw new BadRequestException('Experiment not found');
        }

        if (!experiment.status || experiment.status !== 'active') {
            throw new BadRequestException('Experiment is not active');
        }

        // Verify file was actually saved
        const filePath = `${this.configService.get<string>('UPLOAD_DIR')}/${file.filename}`;
        try {
            // Check if file exists using fs
            await fs.promises.access(filePath, fs.constants.F_OK);
        } catch (error) {
            throw new BadRequestException('File upload failed - file not saved to disk');
        }

        const image = new this.imageModel({
            originalFilename: file.filename,
            mimetype: file.mimetype,
            experimentId: uploadImageDto.experimentId,
            userId: uploadImageDto.studentId,
            imageUrl: filePath,
            description: uploadImageDto.description || '',
        });

        const result = await image.save();

        if (!result) {
            // If database save fails, clean up the uploaded file
            try {
                await fs.promises.unlink(filePath);
            } catch (error) {
                // Log cleanup error but don't throw
                console.error('Failed to clean up file after failed database save:', error);
            }
            throw new BadRequestException('Failed to store image metadata');
        }

        // Queue the image for Matrix code processing
        this.imageProcessingService.queueImageProcessing(result._id.toString()).catch(error => {
            console.error('Failed to queue image processing:', error);
        });

        return {
            id: result._id.toString(),
            description: result.description,
            feedback: result.feedback,
            processingStatus: result.processingStatus,
            url: result.imageUrl,
            filename: result.originalFilename,
            mimetype: result.mimetype,
        };
    }

    async fetchImages(experimentId: string, studentId: string): Promise<ImagesResponseDto> {
        const image = await this.imageModel.
            find({ experimentId, userId: studentId })
            .sort({ createdAt: -1 })
            .exec();

        if (!image) {
            throw new BadRequestException('Image not found');
        }

        const images = image.map((img) => ({
            id: img._id.toString(),
            url: img.imageUrl,
            filename: img.originalFilename,
            mimetype: img.mimetype,
            description: img.description,
            feedback: img.feedback,
            processingStatus: img.processingStatus,
        }));

        return {
            images: images,
        };
    }

    async deleteImage(fileId: string, studentId: string): Promise<any> {

        const image = await this.imageModel
            .findById(fileId, { userId: studentId })
            .select('originalFilename processingStatus')
            .exec();
        if (!image) {
            throw new BadRequestException('File not found');
        }

        if (image.processingStatus == 'accepted') {
            throw new BadRequestException('File cannot be deleted now!');
        }

        const experiment = await this.experimentModel.findById(image.experimentId).exec();
        if (!experiment) {
            throw new BadRequestException('Experiment not found');
        }
        if (!experiment.status || experiment.status !== 'active') {
            throw new BadRequestException('Experiment is not active');
        }

        const filename = image.originalFilename;

        const filePath = `${this.configService.get<string>('UPLOAD_DIR')}/${filename}`;

        try {
            await fs.promises.access(filePath, fs.constants.F_OK);
            await fs.promises.unlink(filePath);

            return await this.imageModel.deleteOne({ _id: fileId }).exec();
        }
        catch (error) {
            throw new BadRequestException('File not found');
        }
    }

    async deleteImageByAdmin(fileId: string): Promise<void> {

        const image = await this.imageModel.findById(fileId).exec();
        if (!image) {
            throw new BadRequestException('File not found');
        }
        const filename = image.originalFilename;

        const filePath = `${this.configService.get<string>('UPLOAD_DIR')}/${filename}`;
        try {
            await fs.promises.access(filePath, fs.constants.F_OK);
        }
        catch (error) {
            throw new BadRequestException('File not found');
        }
        try {
            await fs.promises.unlink(filePath);
            await this.imageModel.deleteOne({ _id: fileId }).exec();
        }
        catch (error) {
            throw new BadRequestException('Failed to delete file');
        }
    }

    async addFeedback(
        fileId: string,
        dto: AddFeedbackDto,
    ): Promise<ImageResponseDto> {
        const image = await this.imageModel.findById(fileId).exec();
        if (!image) {
            throw new BadRequestException('File not found');
        }

        image.feedback = dto.feedback;
        image.processingStatus = 'accepted';
        await image.save();

        return {
            id: image._id.toString(),
            url: image.imageUrl,
            filename: image.originalFilename,
            mimetype: image.mimetype,
            description: image.description,
            feedback: image.feedback,
            processingStatus: image.processingStatus,
        };
    }
}
