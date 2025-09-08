import { ApiProperty } from '@nestjs/swagger';

export class UserProgressDto {
  @ApiProperty()
  status: string;

  @ApiProperty({ required: false })
  userAnswer?: string;

  @ApiProperty({ required: false })
  isAnswerCorrect?: boolean;

  @ApiProperty({ required: false })
  photoUrl?: string;

  @ApiProperty({ required: false })
  completedAt?: Date;
}

export class ChallengeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  question: string;

  @ApiProperty({ enum: ['easy', 'medium', 'hard', 'expert'] })
  difficulty: string;

  @ApiProperty()
  hasPhotoExperiment: boolean;

  @ApiProperty({ required: false })
  photoPrompt?: string;

  @ApiProperty()
  order: number;

  @ApiProperty({ type: UserProgressDto, required: false })
  userProgress?: UserProgressDto;
}