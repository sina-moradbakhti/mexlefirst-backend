import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length } from 'class-validator';

export class AddFeedbackDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Length(20, 300)
  feedback: string;
}