import { ApiProperty } from '@nestjs/swagger';

export class SubmissionResultDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty({ required: false })
  isCorrect?: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ required: false })
  nextChallengeUnlocked?: boolean;

  @ApiProperty({ required: false })
  requiresPhotoExperiment?: boolean;
}