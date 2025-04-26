import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum } from 'class-validator';
import { UserRole } from '../enums/user.enum';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
    @ApiProperty()
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    password: string;

    // @ApiProperty()
    // @IsEnum(UserRole)
    // @IsNotEmpty()
    // role: UserRole = UserRole.STUDENT;
}
