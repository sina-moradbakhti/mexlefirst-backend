import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  Put,
} from '@nestjs/common';
import { ChallengesService } from '../services/challenges.service';
import { CreateChallengeDto } from '../dto/create-challenge.dto';
import { UpdateChallengeDto } from '../dto/update-challenge.dto';
import { ChallengeFilterDto } from '../dto/challenge-filter.dto';
import { UserProgressSummaryDto, ChallengeProgressDetailDto } from '../dto/user-progress-response.dto';
import { ChallengeResponsesDto } from '../dto/challenge-responses.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../shared/enums/user.enum';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PaginatedResponse } from '../../shared/dto/filter.dto';
import { Challenge } from '../schemas/challenge.schema';

@ApiTags('Instructor Challenges')
@Controller('instructor/challenges')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class InstructorChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  @Post()
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Create new challenge [Instructor/Admin Only]',
    description: 'Creates a new challenge with the provided details.'
  })
  @ApiResponse({ status: 201, description: 'Challenge successfully created' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden - Instructor/Admin access required' })
  async createChallenge(@Body() createChallengeDto: CreateChallengeDto): Promise<Challenge> {
    return this.challengesService.createChallenge(createChallengeDto);
  }

  @Get()
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get all challenges [Instructor/Admin Only]',
    description: 'Retrieves all challenges with filtering and pagination options'
  })
  @ApiResponse({ status: 200, description: 'List of challenges retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Instructor/Admin access required' })
  async getAllChallenges(@Query() filterDto: ChallengeFilterDto): Promise<PaginatedResponse<Challenge>> {
    return this.challengesService.getAllChallenges(filterDto);
  }

  @Get(':id')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get challenge by ID [Instructor/Admin Only]',
    description: 'Retrieves a specific challenge by its ID'
  })
  @ApiResponse({ status: 200, description: 'Challenge retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Challenge not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Instructor/Admin access required' })
  async getChallengeById(@Param('id') id: string): Promise<Challenge> {
    return this.challengesService.getChallengeById(id);
  }

  @Get(':id/responses')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get student responses for a challenge [Instructor/Admin Only]',
    description: 'Retrieves all student submissions/responses for a specific challenge'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Student responses retrieved successfully'
  })
  @ApiResponse({ status: 404, description: 'Challenge not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Instructor/Admin access required' })
  async getChallengeResponses(
    @Param('id') challengeId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10
  ): Promise<ChallengeResponsesDto> {
    return this.challengesService.getChallengeResponses(challengeId, { page, limit });
  }

  @Put(':id')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update challenge [Instructor/Admin Only]',
    description: 'Updates an existing challenge with the provided details'
  })
  @ApiResponse({ status: 200, description: 'Challenge updated successfully' })
  @ApiResponse({ status: 404, description: 'Challenge not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Instructor/Admin access required' })
  async updateChallenge(
    @Param('id') id: string,
    @Body() updateChallengeDto: UpdateChallengeDto
  ): Promise<Challenge> {
    return this.challengesService.updateChallenge(id, updateChallengeDto);
  }

  @Delete(':id')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Delete challenge [Instructor/Admin Only]',
    description: 'Deletes a challenge by its ID. Warning: This will also delete all user progress for this challenge.'
  })
  @ApiResponse({ status: 200, description: 'Challenge deleted successfully' })
  @ApiResponse({ status: 404, description: 'Challenge not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Instructor/Admin access required' })
  async deleteChallenge(@Param('id') id: string): Promise<{ message: string }> {
    return this.challengesService.deleteChallenge(id);
  }

  @Get('progress/summary')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get user progress summary [Instructor/Admin Only]',
    description: 'Retrieves a summary of all users\' progress across challenges'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User progress summary retrieved successfully',
    type: [UserProgressSummaryDto]
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Instructor/Admin access required' })
  async getUserProgressSummary(): Promise<UserProgressSummaryDto[]> {
    return this.challengesService.getUserProgressSummary();
  }

  @Get('progress/user/:userId')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get specific user progress [Instructor/Admin Only]',
    description: 'Retrieves detailed progress information for a specific user'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User progress details retrieved successfully',
    type: [ChallengeProgressDetailDto]
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Instructor/Admin access required' })
  async getUserProgress(@Param('userId') userId: string): Promise<ChallengeProgressDetailDto[]> {
    return this.challengesService.getUserProgressDetails(userId);
  }

  @Post('progress/reset/:userId')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Reset user progress [Instructor/Admin Only]',
    description: 'Resets all challenge progress for a specific user'
  })
  @ApiResponse({ status: 200, description: 'User progress reset successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Instructor/Admin access required' })
  async resetUserProgress(@Param('userId') userId: string): Promise<{ message: string }> {
    return this.challengesService.resetUserProgress(userId);
  }

  @Post('reorder')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Reorder challenges [Instructor/Admin Only]',
    description: 'Updates the order of challenges'
  })
  @ApiResponse({ status: 200, description: 'Challenges reordered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid order data' })
  @ApiResponse({ status: 403, description: 'Forbidden - Instructor/Admin access required' })
  async reorderChallenges(
    @Body() reorderData: { challengeId: string; newOrder: number }[]
  ): Promise<{ message: string }> {
    return this.challengesService.reorderChallenges(reorderData);
  }
}