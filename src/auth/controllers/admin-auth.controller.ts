import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { RegisterDto } from '../../shared/dtos/register.dto';
import { LoginDto } from '../../shared/dtos/login.dto';
import { AdminAuthService } from '../services/admin-auth.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Admin Auth 👑')
@Controller('admin/auth')
export class AdminAuthController {
    constructor(private readonly authService: AdminAuthService) {}

    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    async register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }
}