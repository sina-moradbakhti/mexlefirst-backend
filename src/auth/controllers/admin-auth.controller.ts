import { Body, Controller, Post, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { RegisterDto } from '../../shared/dtos/register.dto';
import { LoginDto } from '../../shared/dtos/login.dto';
import { AdminAuthService } from '../services/admin-auth.service';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from 'src/shared/enums/user.enum';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';

@ApiTags('Admin Auth 👑')
@Controller('admin/auth')
export class AdminAuthController {
    constructor(private readonly authService: AdminAuthService) { }

    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    async register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto, UserRole.ADMIN);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto, UserRole.ADMIN);
    }

    @Post('instructor/login')
    @HttpCode(HttpStatus.OK)
    async loginAsInstructor(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto, UserRole.INSTRUCTOR);
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @Post('create/instructor')
    @ApiOperation({
        summary: 'Create Instructor [ADMIN ONLY]',
    })
    @ApiResponse({ status: 201, description: 'Instructor successfully created' })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 403, description: 'Forbidden - User is not a valid admin' })
    @HttpCode(HttpStatus.CREATED)
    async createInstructor(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto, UserRole.INSTRUCTOR);
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @Post('create/student')
    @ApiOperation({
        summary: 'Create Student [ADMIN ONLY]',
    })
    @ApiResponse({ status: 201, description: 'Student successfully created' })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 403, description: 'Forbidden - User is not a valid admin' })
    @HttpCode(HttpStatus.CREATED)
    async createStudent(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto, UserRole.STUDENT);
    }
}