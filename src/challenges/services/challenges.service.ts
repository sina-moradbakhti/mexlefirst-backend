import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Challenge, ChallengeDocument } from '../schemas/challenge.schema';
import { UserChallengeProgress, UserChallengeProgressDocument } from '../schemas/user-challenge-progress.schema';
import { ChallengeResponseDto } from '../dto/challenge-response.dto';
import { SubmissionResultDto } from '../dto/submission-result.dto';
import { ImageService } from '../../image/services/image.service';

@Injectable()
export class ChallengesService {
  constructor(
    @InjectModel(Challenge.name) private challengeModel: Model<ChallengeDocument>,
    @InjectModel(UserChallengeProgress.name) private progressModel: Model<UserChallengeProgressDocument>,
    private imageService: ImageService,
  ) {}

  async getChallengesWithProgress(userId: string): Promise<ChallengeResponseDto[]> {
    const challenges = await this.challengeModel.find().sort({ order: 1 }).exec();
    const progressRecords = await this.progressModel.find({ userId }).populate('challengeId').exec();
    
    // Create a map of challenge progress for quick lookup
    const progressMap = new Map();
    progressRecords.forEach(progress => {
      progressMap.set(progress.challengeId.toString(), progress);
    });

    // Initialize progress for first challenge if no progress exists
    if (challenges.length > 0 && progressRecords.length === 0) {
      await this.initializeFirstChallenge(userId, challenges[0]._id.toString());
      // Refetch progress after initialization
      const updatedProgress = await this.progressModel.find({ userId }).populate('challengeId').exec();
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

  private validateAnswer(userAnswer: string, correctAnswer: string): boolean {
    const normalizeAnswer = (answer: string) => 
      answer.toLowerCase().trim().replace(/\s+/g, ' ');
    
    const normalizedUserAnswer = normalizeAnswer(userAnswer);
    const normalizedCorrectAnswer = normalizeAnswer(correctAnswer);
    
    // Support multiple acceptable answers (comma-separated)
    const acceptableAnswers = normalizedCorrectAnswer.split(',').map(ans => ans.trim());
    
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