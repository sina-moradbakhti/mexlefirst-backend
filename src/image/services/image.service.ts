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

@Injectable()
export class ImageService {
    constructor(
        @InjectModel(Image.name) private imageModel: Model<ImageDocument>,
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        @InjectModel(Experiment.name) private experimentModel: Model<ExperimentDocument>,
        private configService: ConfigService,
    ) { }

    async findAll(filter: ImageFilterDto): Promise<PaginatedResponse<ImageDocument>> {
        const query = {};

        if (filter.userId) {
            const user = await this.userModel.findOne({
                email: filter.userId,
                role: 'student',
            })
                .exec();

            if (user) {
                query['userId'] = user._id;
            }else{
                return {
                    data: [],
                    total: 0,
                    page: filter.page,
                    limit: filter.limit,
                    pages: 0,
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

        return {
            url: result.imageUrl,
            filename: result.originalFilename,
            mimetype: result.mimetype,
        };
    }

    async deleteImage(filename: string): Promise<void> {
        // Implement delete logic here
        // This would typically involve:
        // 1. Removing the file from storage
        // 2. Removing any database records if applicable
    }
}
