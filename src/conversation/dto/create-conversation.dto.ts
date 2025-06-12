import { IsString, IsNotEmpty, IsOptional, IsMongoId } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({ description: 'Experiment ID', example: '507f1f77bcf86cd799439011' })
  @IsMongoId()
  @IsNotEmpty()
  experimentId: string;

  @ApiPropertyOptional({ description: 'Initial message content' })
  @IsString()
  @IsOptional()
  initialMessage?: string;
}

// Internal DTO used by the service (includes auto-populated fields)
export class InternalCreateConversationDto {
  experimentId: string;
  studentId: string;
  instructorId: string;
  title: string;
  initialMessage?: string;
}