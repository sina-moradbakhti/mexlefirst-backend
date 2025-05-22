import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UploadImageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  experimentId: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  description?: string;

  // This will be set automatically from the authenticated user
  studentId: string;
}