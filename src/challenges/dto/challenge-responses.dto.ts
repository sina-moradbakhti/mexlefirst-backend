import { ApiProperty } from '@nestjs/swagger';

export class StudentResponseDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  userEmail: string;

  @ApiProperty()
  userName?: string;

  @ApiProperty()
  userAnswer?: string;

  @ApiProperty()
  isAnswerCorrect?: boolean;

  @ApiProperty()
  status: string; // locked, unlocked, completed

  @ApiProperty()
  photoUrl?: string;

  @ApiProperty()
  submittedAt?: Date;

  @ApiProperty()
  completedAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class ChallengeResponsesDto {
  @ApiProperty()
  challengeId: string;

  @ApiProperty()
  challengeTitle: string;

  @ApiProperty()
  challengeOrder: number;

  @ApiProperty()
  totalResponses: number;

  @ApiProperty()
  correctResponses: number;

  @ApiProperty()
  incorrectResponses: number;

  @ApiProperty()
  completedResponses: number;

  @ApiProperty({ type: [StudentResponseDto] })
  responses: StudentResponseDto[];

  @ApiProperty()
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}