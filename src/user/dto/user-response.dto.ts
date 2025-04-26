import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../shared/enums/user.enum';

export class UserResponseDto {
    @ApiProperty({
        example: '507f1f77bcf86cd799439011',
        description: 'The unique identifier of the user'
    })
    id: string;

    @ApiProperty({
        example: 'user@example.com',
        description: 'The email address of the user'
    })
    email: string;

    @ApiProperty({
        enum: UserRole,
        example: UserRole.STUDENT,
        description: 'The role of the user'
    })
    role: UserRole;

    @ApiProperty({
        example: '2023-01-01T00:00:00.000Z',
        description: 'The date when the user was created'
    })
    createdAt: Date;

    @ApiProperty({
        example: '2023-01-01T00:00:00.000Z',
        description: 'The date when the user was last updated'
    })
    updatedAt: Date;
}
