import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, IsEnum } from 'class-validator';

export class CreateChallengeDto {
  @ApiProperty({
    description: 'Challenge title',
    example: 'Basic Circuit Components'
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Challenge description',
    example: 'Learn about the fundamental components used in electrical circuits.'
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'The question to ask the user',
    example: 'What are the four basic passive components in electrical circuits?'
  })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiProperty({
    description: 'Expected correct answer (supports comma-separated alternatives)',
    example: 'resistor, capacitor, inductor, diode'
  })
  @IsString()
  @IsNotEmpty()
  correctAnswer: string;

  @ApiProperty({
    description: 'Challenge difficulty level',
    enum: ['easy', 'medium', 'hard', 'expert'],
    example: 'easy'
  })
  @IsEnum(['easy', 'medium', 'hard', 'expert'])
  difficulty: string;

  @ApiProperty({
    description: 'Whether this challenge requires a photo experiment',
    example: false
  })
  @IsBoolean()
  @IsOptional()
  hasPhotoExperiment?: boolean = false;

  @ApiProperty({
    description: 'Instructions for photo experiment (if applicable)',
    example: 'Build a simple LED circuit with a resistor and battery. Take a photo showing the LED lit up.',
    required: false
  })
  @IsString()
  @IsOptional()
  photoPrompt?: string;

  @ApiProperty({
    description: 'Challenge order/sequence number',
    example: 1
  })
  @IsNumber()
  order: number;
}