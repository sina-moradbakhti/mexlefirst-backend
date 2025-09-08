import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class SubmitAnswerDto {
  @ApiProperty({
    description: 'The user\'s answer to the challenge question',
    example: 'resistor'
  })
  @IsString()
  @IsNotEmpty()
  answer: string;
}