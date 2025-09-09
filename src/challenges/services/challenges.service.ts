import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Challenge, ChallengeDocument } from '../schemas/challenge.schema';
import { UserChallengeProgress, UserChallengeProgressDocument } from '../schemas/user-challenge-progress.schema';
import { ChallengeResponseDto } from '../dto/challenge-response.dto';
import { SubmissionResultDto } from '../dto/submission-result.dto';
import { CreateChallengeDto } from '../dto/create-challenge.dto';
import { UpdateChallengeDto } from '../dto/update-challenge.dto';
import { ChallengeFilterDto } from '../dto/challenge-filter.dto';
import { UserProgressSummaryDto, ChallengeProgressDetailDto } from '../dto/user-progress-response.dto';
import { ChallengeResponsesDto } from '../dto/challenge-responses.dto';
import { ImageService } from '../../image/services/image.service';
import { PaginatedResponse } from '../../shared/dto/filter.dto';

@Injectable()
export class ChallengesService {
  constructor(
    @InjectModel(Challenge.name) private challengeModel: Model<ChallengeDocument>,
    @InjectModel(UserChallengeProgress.name) private progressModel: Model<UserChallengeProgressDocument>,
    private imageService: ImageService,
  ) {}

  // ==================== STUDENT METHODS ====================

  async getChallengesWithProgress(userId: string): Promise<ChallengeResponseDto[]> {
    const challenges = await this.challengeModel.find().sort({ order: 1 }).exec();
    const progressRecords = await this.progressModel.find({ userId }).exec();
    
    // Create a map of challenge progress for quick lookup
    const progressMap = new Map();
    progressRecords.forEach(progress => {
      progressMap.set(progress.challengeId.toString(), progress);
    });

    // Initialize progress for first challenge if no progress exists
    if (challenges.length > 0 && progressRecords.length === 0) {
      await this.initializeFirstChallenge(userId, challenges[0]._id.toString());
      // Refetch progress after initialization
      const updatedProgress = await this.progressModel.find({ userId }).exec();
      updatedProgress.forEach(progress => {
        progressMap.set(progress.challengeId.toString(), progress);
      });
    }

    return challenges.map(challenge => this.mapChallengeToResponse(challenge, progressMap.get(challenge._id.toString())));
  }

  async getChallengeWithProgress(challengeId: string, userId: string): Promise<ChallengeResponseDto> {
    const challenge = await this.challengeModel.findById(challengeId).exec();
    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }

    const progress = await this.progressModel.findOne({ userId, challengeId }).exec();
    return this.mapChallengeToResponse(challenge, progress);
  }

  async submitAnswer(challengeId: string, userId: string, answer: string): Promise<SubmissionResultDto> {
    const challenge = await this.challengeModel.findById(challengeId).exec();
    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }

    // Check if user has access to this challenge
    let progress = await this.progressModel.findOne({ userId, challengeId }).exec();
    if (!progress) {
      // Initialize progress if it doesn't exist (for first challenge)
      const isFirstChallenge = await this.isFirstChallenge(challengeId);
      if (!isFirstChallenge) {
        throw new BadRequestException('Challenge is not accessible');
      }
      progress = await this.initializeFirstChallenge(userId, challengeId);
    }

    if (progress.status === 'locked') {
      throw new BadRequestException('Challenge is locked');
    }

    if (progress.status === 'completed') {
      return {
        success: false,
        message: 'Challenge already completed'
      };
    }

    // Validate answer
    const isCorrect = this.validateAnswer(answer, challenge.correctAnswer);
    
    // Update progress
    progress.userAnswer = answer;
    progress.isAnswerCorrect = isCorrect;

    if (isCorrect) {
      if (challenge.hasPhotoExperiment) {
        // Answer is correct but photo experiment is required
        await progress.save();
        return {
          success: true,
          isCorrect: true,
          message: 'Correct answer! Now submit your photo experiment.',
          requiresPhotoExperiment: true
        };
      } else {
        // Complete the challenge and unlock next
        progress.status = 'completed';
        progress.completedAt = new Date();
        await progress.save();
        
        const nextChallengeUnlocked = await this.unlockNextChallenge(userId, challenge.order);
        
        return {
          success: true,
          isCorrect: true,
          message: 'Correct answer! Challenge completed.',
          nextChallengeUnlocked
        };
      }
    } else {
      await progress.save();
      return {
        success: false,
        isCorrect: false,
        message: 'Incorrect answer. Please try again.'
      };
    }
  }

  async submitPhoto(challengeId: string, userId: string, file: Express.Multer.File): Promise<SubmissionResultDto> {
    if (!file) {
      throw new BadRequestException('No photo file provided');
    }

    const challenge = await this.challengeModel.findById(challengeId).exec();
    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }

    if (!challenge.hasPhotoExperiment) {
      throw new BadRequestException('This challenge does not require a photo experiment');
    }

    const progress = await this.progressModel.findOne({ userId, challengeId }).exec();
    if (!progress || !progress.isAnswerCorrect) {
      throw new BadRequestException('You must answer the question correctly before submitting a photo');
    }

    if (progress.status === 'completed') {
      return {
        success: false,
        message: 'Challenge already completed'
      };
    }

    // Use existing ImageService to handle file upload
    // Create a dummy experiment ID for challenge photos (we can use challengeId)
    const uploadResult = await this.imageService.uploadImage(file, {
      experimentId: challengeId, // Use challengeId as experimentId for consistency
      description: `Challenge ${challenge.title} - Photo Experiment`,
      studentId: userId
    });

    // Complete the challenge
    progress.photoUrl = uploadResult.url;
    progress.status = 'completed';
    progress.completedAt = new Date();
    await progress.save();

    const nextChallengeUnlocked = await this.unlockNextChallenge(userId, challenge.order);

    return {
      success: true,
      message: 'Photo experiment submitted successfully! Challenge completed.',
      nextChallengeUnlocked
    };
  }

  // ==================== INSTRUCTOR/ADMIN METHODS ====================

  async createChallenge(createChallengeDto: CreateChallengeDto): Promise<Challenge> {
    const challenge = new this.challengeModel(createChallengeDto);
    return challenge.save();
  }

  async getAllChallenges(filterDto: ChallengeFilterDto): Promise<PaginatedResponse<Challenge>> {
    const query = {};

    if (filterDto.difficulty) {
      query['difficulty'] = filterDto.difficulty;
    }

    if (filterDto.hasPhotoExperiment) {
      query['hasPhotoExperiment'] = filterDto.hasPhotoExperiment === 'true';
    }

    if (filterDto.search && filterDto.searchBy && ['title', 'description'].includes(filterDto.searchBy)) {
      query[filterDto.searchBy] = {
        $regex: filterDto.search,
        $options: 'i',
      };
    }

    const skip = (filterDto.page - 1) * filterDto.limit;
    const sort = filterDto.sort || 'order';
    const order = filterDto.order || 'asc';

    const [items, total] = await Promise.all([
      this.challengeModel
        .find(query)
        .skip(skip)
        .limit(filterDto.limit)
        .sort({ [sort]: order === 'asc' ? 1 : -1 })
        .exec(),
      this.challengeModel.countDocuments(query).exec(),
    ]);

    const pages = Math.ceil(total / filterDto.limit);

    return {
      data: items,
      total,
      page: filterDto.page,
      limit: filterDto.limit,
      pages,
    };
  }

  async getChallengeById(id: string): Promise<Challenge> {
    const challenge = await this.challengeModel.findById(id).exec();
    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }
    return challenge;
  }

  async updateChallenge(id: string, updateChallengeDto: UpdateChallengeDto): Promise<Challenge> {
    const challenge = await this.challengeModel.findByIdAndUpdate(id, updateChallengeDto, { new: true }).exec();
    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }
    return challenge;
  }

  async deleteChallenge(id: string): Promise<{ message: string }> {
    const challenge = await this.challengeModel.findById(id).exec();
    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }

    // Delete all user progress for this challenge
    await this.progressModel.deleteMany({ challengeId: id }).exec();
    
    // Delete the challenge
    await this.challengeModel.findByIdAndDelete(id).exec();

    return { message: 'Challenge and all associated progress deleted successfully' };
  }

  async getUserProgressSummary(): Promise<UserProgressSummaryDto[]> {
    const totalChallenges = await this.challengeModel.countDocuments().exec();
    
    const progressAggregation = await this.progressModel.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $group: {
          _id: '$userId',
          userEmail: { $first: '$user.email' },
          totalProgress: { $sum: 1 },
          completedChallenges: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          unlockedChallenges: {
            $sum: { $cond: [{ $eq: ['$status', 'unlocked'] }, 1, 0] }
          },
          lastActivity: { $max: '$updatedAt' }
        }
      }
    ]);

    return progressAggregation.map(item => ({
      userId: item._id.toString(),
      userEmail: item.userEmail,
      totalChallenges,
      completedChallenges: item.completedChallenges,
      unlockedChallenges: item.unlockedChallenges,
      progressPercentage: Math.round((item.completedChallenges / totalChallenges) * 100),
      lastActivity: item.lastActivity
    }));
  }

  async getUserProgressDetails(userId: string): Promise<ChallengeProgressDetailDto[]> {
    const progressRecords = await this.progressModel
      .find({ userId })
      .populate('challengeId')
      .sort({ 'challengeId.order': 1 })
      .exec();

    return progressRecords.map(progress => ({
      challengeId: (progress.challengeId as any)._id.toString(),
      challengeTitle: (progress.challengeId as any).title,
      challengeOrder: (progress.challengeId as any).order,
      status: progress.status,
      userAnswer: progress.userAnswer,
      isAnswerCorrect: progress.isAnswerCorrect,
      photoUrl: progress.photoUrl,
      completedAt: progress.completedAt,
      createdAt: (progress as any).createdAt,
      updatedAt: (progress as any).updatedAt
    }));
  }

  async resetUserProgress(userId: string): Promise<{ message: string }> {
    await this.progressModel.deleteMany({ userId }).exec();
    
    // Initialize first challenge
    const firstChallenge = await this.challengeModel.findOne({ order: 1 }).exec();
    if (firstChallenge) {
      await this.initializeFirstChallenge(userId, firstChallenge._id.toString());
    }

    return { message: 'User progress reset successfully' };
  }

  async reorderChallenges(reorderData: { challengeId: string; newOrder: number }[]): Promise<{ message: string }> {
    const bulkOps = reorderData.map(item => ({
      updateOne: {
        filter: { _id: item.challengeId },
        update: { order: item.newOrder }
      }
    }));

    await this.challengeModel.bulkWrite(bulkOps);
    return { message: 'Challenges reordered successfully' };
  }

  async getChallengeResponses(challengeId: string, pagination: { page: number; limit: number }): Promise<ChallengeResponsesDto> {
    // First verify the challenge exists
    const challenge = await this.challengeModel.findById(challengeId).exec();
    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }

    const skip = (pagination.page - 1) * pagination.limit;

    // Get all progress records for this challenge with user information
    const progressRecords = await this.progressModel
      .find({ challengeId })
      .populate('userId', 'email role') // Only populate email and role fields
      .sort({ updatedAt: -1 }) // Most recent first
      .skip(skip)
      .limit(pagination.limit)
      .exec();

    // Get total count for pagination
    const totalResponses = await this.progressModel.countDocuments({ challengeId }).exec();

    // Get statistics
    const stats = await this.progressModel.aggregate([
      { $match: { challengeId: new Types.ObjectId(challengeId) } },
      {
        $group: {
          _id: null,
          totalResponses: { $sum: 1 },
          correctResponses: {
            $sum: { $cond: [{ $eq: ['$isAnswerCorrect', true] }, 1, 0] }
          },
          incorrectResponses: {
            $sum: { $cond: [{ $eq: ['$isAnswerCorrect', false] }, 1, 0] }
          },
          completedResponses: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      }
    ]);

    const statistics = stats[0] || {
      totalResponses: 0,
      correctResponses: 0,
      incorrectResponses: 0,
      completedResponses: 0
    };

    // Map progress records to response format
    const responses = progressRecords.map(progress => ({
      userId: (progress.userId as any)._id.toString(),
      userEmail: (progress.userId as any).email,
      userName: (progress.userId as any).email.split('@')[0], // Use email prefix as name
      userAnswer: progress.userAnswer,
      isAnswerCorrect: progress.isAnswerCorrect,
      status: progress.status,
      photoUrl: progress.photoUrl,
      submittedAt: progress.userAnswer ? (progress as any).updatedAt : null,
      completedAt: progress.completedAt,
      createdAt: (progress as any).createdAt,
      updatedAt: (progress as any).updatedAt
    }));

    const pages = Math.ceil(totalResponses / pagination.limit);

    return {
      challengeId: challenge._id.toString(),
      challengeTitle: challenge.title,
      challengeOrder: challenge.order,
      totalResponses: statistics.totalResponses,
      correctResponses: statistics.correctResponses,
      incorrectResponses: statistics.incorrectResponses,
      completedResponses: statistics.completedResponses,
      responses,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: totalResponses,
        pages
      }
    };
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private validateAnswer(userAnswer: string, correctAnswer: string): boolean {
    const normalizeAnswer = (answer: string) => 
      answer.toLowerCase().trim().replace(/\s+/g, ' ');
    
    const normalizedUserAnswer = normalizeAnswer(userAnswer);
    const normalizedCorrectAnswer = normalizeAnswer(correctAnswer);
    
    // First check if the answers match exactly
    if (normalizedUserAnswer === normalizedCorrectAnswer) {
      return true;
    }
    
    // Support multiple acceptable answers (comma-separated in correctAnswer)
    const acceptableAnswers = normalizedCorrectAnswer.split(',').map(ans => ans.trim());
    
    // Check if user answer matches any of the acceptable answers
    return acceptableAnswers.includes(normalizedUserAnswer);
  }

  private async isFirstChallenge(challengeId: string): Promise<boolean> {
    const challenge = await this.challengeModel.findById(challengeId).exec();
    return challenge && challenge.order === 1;
  }

  private async initializeFirstChallenge(userId: string, challengeId: string) {
    const progress = new this.progressModel({
      userId,
      challengeId,
      status: 'unlocked'
    });
    return await progress.save();
  }

  private async unlockNextChallenge(userId: string, currentOrder: number): Promise<boolean> {
    const nextChallenge = await this.challengeModel.findOne({ order: currentOrder + 1 }).exec();
    if (!nextChallenge) {
      return false; // No next challenge
    }

    // Check if next challenge is already unlocked
    const existingProgress = await this.progressModel.findOne({ 
      userId, 
      challengeId: nextChallenge._id 
    }).exec();

    if (!existingProgress) {
      // Create new progress record for next challenge
      const nextProgress = new this.progressModel({
        userId,
        challengeId: nextChallenge._id,
        status: 'unlocked'
      });
      await nextProgress.save();
      return true;
    }

    return false; // Already existed
  }

  private mapChallengeToResponse(challenge: ChallengeDocument, progress?: UserChallengeProgressDocument): ChallengeResponseDto {
    const response: ChallengeResponseDto = {
      id: challenge._id.toString(),
      title: challenge.title,
      description: challenge.description,
      question: challenge.question,
      difficulty: challenge.difficulty,
      hasPhotoExperiment: challenge.hasPhotoExperiment,
      photoPrompt: challenge.photoPrompt,
      order: challenge.order
    };

    if (progress) {
      response.userProgress = {
        status: progress.status,
        userAnswer: progress.userAnswer,
        isAnswerCorrect: progress.isAnswerCorrect,
        photoUrl: progress.photoUrl,
        completedAt: progress.completedAt
      };
    } else {
      // Default status for challenges without progress
      response.userProgress = {
        status: 'locked'
      };
    }

    return response;
  }
}