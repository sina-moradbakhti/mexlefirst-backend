import { Controller, Get, Post, Body, Param, Delete, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserService } from './user.service';
import { User } from './schemas/user.schema';
import { UserRole } from '../shared/enums/user.enum';
import { UserResponseDto } from './dto/user-response.dto';
import { AuthenticatedRequest } from 'src/auth/interfaces/authenticated-request.interface';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UserController {
    constructor(private readonly userService: UserService) { }

    @Get('me')
    @ApiOperation({ summary: 'Get current user information' })
    @ApiResponse({
        status: 200,
        description: 'Returns the current user information.',
        type: UserResponseDto
    })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    async getCurrentUser(@Req() req: AuthenticatedRequest): Promise<UserResponseDto> {
        const user = await this.userService.findById(req.user.id);
        return this.transformToDto(user);
    }

    @Get()
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Get all users (Admin only)' })
    @ApiResponse({
        status: 200,
        description: 'Returns all users.',
        type: [UserResponseDto]
    })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin access required.' })
    async findAll(): Promise<UserResponseDto[]> {
        const users = await this.userService.findAll();
        return users.map(user => this.transformToDto(user));
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a user by id' })
    @ApiParam({
        name: 'id',
        required: true,
        description: 'The id of the user',
        schema: { type: 'string' }
    })
    @ApiResponse({
        status: 200,
        description: 'Returns the user.',
        type: UserResponseDto
    })
    @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions.' })
    @ApiResponse({ status: 404, description: 'User not found.' })
    async findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest): Promise<UserResponseDto> {
        // Allow users to view their own profile or admins to view any profile
        if (id !== req.user.id && req.user.role !== UserRole.ADMIN) {
            throw new ForbiddenException('You can only view your own profile');
        }

        const user = await this.userService.findById(id);
        return this.transformToDto(user);
    }

    private transformToDto(user: User): UserResponseDto {
        const dto = new UserResponseDto();
        dto.id = user._id.toString();
        dto.email = user.email;
        dto.role = user.role;
        return dto;
    }
}
