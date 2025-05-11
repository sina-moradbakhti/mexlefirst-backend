import { Controller, Get, Post, Body, Param, Delete, UseGuards, Req, ForbiddenException, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserService } from '../user.service';
import { User, UserDocument } from '../schemas/user.schema';
import { UserRole } from '../../shared/enums/user.enum';
import { FilterDto, PaginatedResponse } from 'src/shared/dto/filter.dto';
import { UserResponseDto } from '../dto/user-response.dto';

@ApiTags('Instructors')
@Controller('instructor')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class InstructorUserController {
    constructor(private readonly userService: UserService) { }

    @Get('/students')
    @Roles(UserRole.INSTRUCTOR)
    @ApiOperation({ summary: 'Get all students (Instructor only)' })
    @ApiResponse({
        status: 200,
        description: 'Returns all students.',
        type: [UserResponseDto]
    })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin access required.' })
    async findAllStudents(
        @Query() paginationDto: FilterDto,
    ): Promise<PaginatedResponse<UserDocument>> {
        return await this.userService.findAll(
            UserRole.STUDENT,
            paginationDto,
        );
    }
}
