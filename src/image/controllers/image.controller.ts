import {
    Controller,
    Post,
    UseInterceptors,
    UploadedFile,
    Delete,
    Param,
    HttpCode,
    HttpStatus,
    UseGuards,
    Body,
    Request,
    BadRequestException,
    Get
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImageService } from '../services/image.service';
import { ImageResponseDto } from '../../shared/dtos/image-upload.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/shared/enums/user.enum';
import { UploadImageDto } from '../dtos/upload-image.dto';
import { ImagesResponseDto } from 'src/shared/dtos/images-uploaded.dto';

@ApiTags('Image')
@Controller('images')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ImageController {
    constructor(private readonly imageService: ImageService) { }

    @Roles(UserRole.STUDENT)
    @ApiOperation({
        summary: 'Upload Image [Student Only]',
    })
    @ApiResponse({ status: 201, description: 'Image successfully uploaded' })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 403, description: 'Forbidden - User is not a student' })
    @Post('upload')
    @HttpCode(HttpStatus.CREATED)
    @UseInterceptors(FileInterceptor('image'))
    async uploadImage(
        @Request() req,
        @UploadedFile() file: Express.Multer.File,
        @Body() uploadImageDto: UploadImageDto,
    ): Promise<ImageResponseDto> {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }
        uploadImageDto.studentId = req.user.id;
        return this.imageService.uploadImage(file, uploadImageDto);
    }

    @Roles(UserRole.STUDENT)
    @ApiOperation({
        summary: 'Delete Image [Student Only]',
    })
    @ApiResponse({ status: 201, description: 'Image successfully deleted' })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 403, description: 'Forbidden - User is not a student' })
    @Delete(':imageId')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteImage(
        @Request() req,
        @Param('imageId') imageId: string,
    ): Promise<any> {
        const studentId = req.user.id;
        return await this.imageService.deleteImage(imageId, studentId);
    }

    @Roles(UserRole.STUDENT)
    @ApiOperation({
        summary: 'Fetch Images by experimentId [Student Only]',
    })
    @ApiResponse({ status: 403, description: 'Forbidden - User is not a student' })
    @Get(':experimentId')
    async fetchImage(
        @Request() req,
        @Param('experimentId') experimentId: string,
    ): Promise<ImagesResponseDto> {
        const studentId = req.user.id;
        return this.imageService.fetchImages(experimentId, studentId);
    }
}
