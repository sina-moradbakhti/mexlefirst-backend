import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { Image, ImageSchema } from './schemas/image.schema';
import { ImageController } from './controllers/image.controller';
import { ImageService } from './services/image.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UnsupportedFileTypeException } from 'src/shared/errors/unsupported-file-type.exception';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { InstructorImageController } from './controllers/instructor-image.controller';
import { Experiment, ExperimentSchema } from 'src/experiment/schemas/experiment.schema';
import { User, UserSchema } from 'src/user/schemas/user.schema';
import { MatrixCodeDetectorService } from './services/matrix-code-detector.service';
import { ImageProcessingService } from './services/image-processing.service';
import { ImageProcessingGateway } from './gateways/image-processing.gateway';
import { JwtModule } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Image.name, schema: ImageSchema },
            { name: User.name, schema: UserSchema },
            { name: Experiment.name, schema: ExperimentSchema },
        ]),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: {
                    expiresIn: configService.get<string>('JWT_EXPIRATION', '1d'),
                },
            }),
        }),
        MulterModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({
                storage: diskStorage({
                    destination: configService.get<string>('UPLOAD_DIR'),
                    filename: (req, file, callback) => {
                        const date = new Date();
                        // Format: YYYYMMDD
                        const formattedDate = date.getFullYear().toString() +
                            (date.getMonth() + 1).toString().padStart(2, '0') +
                            date.getDate().toString().padStart(2, '0');
                        
                        // Format: HHMM
                        const formattedTime = date.getHours().toString().padStart(2, '0') +
                            date.getMinutes().toString().padStart(2, '0');
                        
                        // Generate random 5 digits
                        const randomDigits = Math.floor(Math.random() * 90000 + 10000);
                        
                        // Get file extension from original filename
                        const fileExt = extname(file.originalname);
                        
                        // Final format: YYYYMMDD-HHMM-XXXXX.ext
                        const filename = `${formattedDate}-${formattedTime}-${randomDigits}${fileExt}`;
                        callback(null, filename);
                    }
                }),
                limits: {
                    fileSize: parseInt(configService.get<string>('MAX_FILE_SIZE')),
                },
                fileFilter: (req, file, callback) => {
                    if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
                        return callback(new UnsupportedFileTypeException(), false);
                    }
                    callback(null, true);
                },
            })
        }),
    ],
    controllers: [
        ImageController,
        InstructorImageController,
    ],
    providers: [
        ImageService,
        MatrixCodeDetectorService,
        ImageProcessingService,
        ImageProcessingGateway,
        UserService,
    ],
    exports: [ImageService, ImageProcessingService],
})
export class ImageModule { }
