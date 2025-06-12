import { IsOptional, IsString, IsNumber, Min, IsEnum, IsMongoId } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ConversationStatus } from '../../shared/enums/conversation.enum';

export class ConversationQueryDto {
  @ApiPropertyOptional({ description: 'Page number', example: 1, minimum: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', example: 10, minimum: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ enum: ConversationStatus, description: 'Filter by conversation status' })
  @IsOptional()
  @IsEnum(ConversationStatus)
  status?: ConversationStatus;

  @ApiPropertyOptional({ description: 'Filter by experiment ID' })
  @IsOptional()
  @IsMongoId()
  experimentId?: string;

  @ApiPropertyOptional({ description: 'Search in conversation titles' })
  @IsOptional()
  @IsString()
  search?: string;
}