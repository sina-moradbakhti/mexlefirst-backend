import { ApiProperty } from '@nestjs/swagger';

export class UserProgressSummaryDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  userEmail: string;

  @ApiProperty()
  totalChallenges: number;

  @ApiProperty()
  completedChallenges: number;

  @ApiProperty()
  unlockedChallenges: number;

  @ApiProperty()
  progressPercentage: number;

  @ApiProperty()
  lastActivity?: Date;
}

export class ChallengeProgressDetailDto {
  @ApiProperty()
  challengeId: string;

  @ApiProperty()
  challengeTitle: string;

  @ApiProperty()
  challengeOrder: number;

  @ApiProperty()
  status: string;

  @ApiProperty()
  userAnswer?: string;

  @ApiProperty()
  isAnswerCorrect?: boolean;

  @ApiProperty()
  photoUrl?: string;

  @ApiProperty()
  completedAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}