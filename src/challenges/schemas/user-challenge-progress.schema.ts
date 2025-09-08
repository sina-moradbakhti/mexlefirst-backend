import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../user/schemas/user.schema';
import { Challenge } from './challenge.schema';

export type UserChallengeProgressDocument = UserChallengeProgress & Document;

@Schema({ timestamps: true })
export class UserChallengeProgress {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: User;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Challenge', required: true })
  challengeId: Challenge;

  @Prop({
    required: true,
    enum: ['locked', 'unlocked', 'completed'],
    default: 'locked'
  })
  status: string;

  @Prop({ required: false })
  userAnswer?: string;

  @Prop({ required: false })
  isAnswerCorrect?: boolean;

  @Prop({ required: false })
  photoUrl?: string;

  @Prop({ required: false })
  completedAt?: Date;
}

export const UserChallengeProgressSchema = SchemaFactory.createForClass(UserChallengeProgress);

// Create compound index for userId and challengeId to ensure uniqueness
UserChallengeProgressSchema.index({ userId: 1, challengeId: 1 }, { unique: true });