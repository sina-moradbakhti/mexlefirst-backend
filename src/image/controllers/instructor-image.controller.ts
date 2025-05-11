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
    Get,
    Query
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
import { ImageFilterDto } from 'src/shared/dto/image-filter.dto';

@ApiTags('Instructor Image')
@Controller('instructor/images')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class InstructorImageController {
    constructor(private readonly imageService: ImageService) { }

    @Get()
    @Roles(UserRole.INSTRUCTOR)
    @ApiOperation({
        summary: 'Get all images [Instructor Only]',
    })
    @ApiResponse({ status: 200, description: 'Returns all images' })
    @ApiResponse({ status: 403, description: 'Forbidden - Instructor access required.' })
    async findAll(
        @Query() filterDto: ImageFilterDto,
    ) {
        return this.imageService.findAll(filterDto);
    }
}
