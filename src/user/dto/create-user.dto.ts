import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../shared/enums/user.enum';
import { RegisterDto } from 'src/shared/dtos/register.dto';

export class CreateUserDto extends RegisterDto {
    @ApiProperty({
        enum: UserRole,
        example: UserRole.STUDENT,
        description: 'The role of the user'
    })
    role: UserRole;
}
