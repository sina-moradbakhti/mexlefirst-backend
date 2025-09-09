import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { FilterDto } from '../../shared/dto/filter.dto';

export class ChallengeFilterDto extends FilterDto {
  @ApiProperty({
    description: 'Filter by difficulty level',
    enum: ['easy', 'medium', 'hard', 'expert'],
    required: false
  })
  @IsOptional()
  @IsEnum(['easy', 'medium', 'hard', 'expert'])
  difficulty?: string;

  @ApiProperty({
    description: 'Filter by photo experiment requirement',
    required: false
  })
  @IsOptional()
  @IsString()
  hasPhotoExperiment?: string;

  @ApiProperty({
    description: 'Search in challenge titles',
    required: false
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Field to search in',
    enum: ['title', 'description'],
    required: false
  })
  @IsOptional()
  @IsEnum(['title', 'description'])
  searchBy?: string;
}