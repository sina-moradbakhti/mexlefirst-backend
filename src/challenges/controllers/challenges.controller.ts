import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ChallengesService } from '../services/challenges.service';
import { SubmitAnswerDto } from '../dto/submit-answer.dto';
import { ChallengeResponseDto } from '../dto/challenge-response.dto';
import { SubmissionResultDto } from '../dto/submission-result.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../shared/enums/user.enum';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';

@ApiTags('challenges')
@Controller('challenges')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  @Get()
  @Roles(UserRole.STUDENT, UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({
    summary: 'Get all challenges with user progress',
    description: 'Retrieves all challenges with the current user\'s progress status'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of challenges with user progress retrieved successfully',
    type: [ChallengeResponseDto]
  })
  async getChallenges(@Request() req): Promise<ChallengeResponseDto[]> {
    return this.challengesService.getChallengesWithProgress(req.user.id);
  }

  @Get(':id')
  @Roles(UserRole.STUDENT, UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({
    summary: 'Get specific challenge with user progress',
    description: 'Retrieves a specific challenge by ID with the current user\'s progress'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Challenge with user progress retrieved successfully',
    type: ChallengeResponseDto
  })
  @ApiResponse({ status: 404, description: 'Challenge not found' })
  async getChallengeById(
    @Param('id') id: string,
    @Request() req
  ): Promise<ChallengeResponseDto> {
    return this.challengesService.getChallengeWithProgress(id, req.user.id);
  }

  @Post(':id/submit-answer')
  @Roles(UserRole.STUDENT, UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({
    summary: 'Submit answer to challenge',
    description: 'Submit a text answer to a challenge question'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Answer submitted successfully',
    type: SubmissionResultDto
  })
  @ApiResponse({ status: 404, description: 'Challenge not found' })
  @ApiResponse({ status: 400, description: 'Invalid answer or challenge not accessible' })
  async submitAnswer(
    @Param('id') challengeId: string,
    @Body() submitAnswerDto: SubmitAnswerDto,
    @Request() req
  ): Promise<SubmissionResultDto> {
    return this.challengesService.submitAnswer(
      challengeId,
      req.user.id,
      submitAnswerDto.answer
    );
  }

  @Post(':id/submit-photo')
  @Roles(UserRole.STUDENT, UserRole.ADMIN, UserRole.INSTRUCTOR)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Submit photo experiment',
    description: 'Submit a photo for the experiment part of a challenge'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Photo submitted successfully',
    type: SubmissionResultDto
  })
  @ApiResponse({ status: 404, description: 'Challenge not found' })
  @ApiResponse({ status: 400, description: 'Invalid file or challenge requirements not met' })
  async submitPhoto(
    @Param('id') challengeId: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req
  ): Promise<SubmissionResultDto> {
    return this.challengesService.submitPhoto(challengeId, req.user.id, file);
  }
}