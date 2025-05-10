import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateExperimentDto {
  @IsString()
  @IsNotEmpty()
  experimentType: string;

  @IsString()
  @IsOptional()
  description?: string;

  // This will be set automatically from the authenticated user
  instructorId: string;
}