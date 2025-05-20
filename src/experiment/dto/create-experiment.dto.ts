import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateExperimentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  experimentType: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  experimentId: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: ['active', 'inactive'], default: 'active' })
  @IsOptional()
  @IsString()
  status: 'active' | 'inactive';

  // This will be set automatically from the authenticated user
  instructorId: string;
}