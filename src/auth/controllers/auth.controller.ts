import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { RegisterDto } from '../../shared/dtos/register.dto';
import { LoginDto } from '../../shared/dtos/login.dto';
import { AuthService } from '../services/auth.service';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

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