import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { RegisterDto } from 'src/shared/dtos/register.dto';
import { LoginDto } from 'src/shared/dtos/login.dto';
import { UserRole } from 'src/shared/enums/user.enum';
import { UserService } from 'src/user/user.service';

@Injectable()
export class AdminAuthService {
    constructor(
        private userService: UserService,
        private jwtService: JwtService,
    ) { }

    async register(registerDto: RegisterDto): Promise<{ token: string }> {
        const { email, password } = registerDto;

        const existingUser = await this.userService.findByEmail(email);
        if (existingUser) {
            throw new ConflictException('Email already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await this.userService.create({
            email,
            password: hashedPassword,
            role: UserRole.ADMIN,
        });

        const token = this.jwtService.sign({ id: user._id, email: user.email, role: user.role });
        return { token };
    }

    async login(loginDto: LoginDto): Promise<{ token: string }> {
        const { email, password } = loginDto;

        const user = await this.userService.findByEmail(email);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const token = this.jwtService.sign({ id: user._id, email: user.email, role: user.role });
        return { token };
    }
}