import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ChallengeDocument = Challenge & Document;

@Schema({ timestamps: true })
export class Challenge {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  question: string;

  @Prop({ required: true })
  correctAnswer: string;

  @Prop({ 
    required: true, 
    enum: ['easy', 'medium', 'hard', 'expert'],
    default: 'easy'
  })
  difficulty: string;

  @Prop({ default: false })
  hasPhotoExperiment: boolean;

  @Prop({ required: false })
  photoPrompt?: string;

  @Prop({ required: true, unique: true })
  order: number;
}

export const ChallengeSchema = SchemaFactory.createForClass(Challenge);