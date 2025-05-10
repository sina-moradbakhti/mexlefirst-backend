import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class UploadImageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  experimentId: string;

  // This will be set automatically from the authenticated user
  studentId: string;
}