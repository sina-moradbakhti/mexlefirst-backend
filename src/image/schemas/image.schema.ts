import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Experiment } from '../../experiment/schemas/experiment.schema';
import { User } from 'src/user/schemas/user.schema';

export type ImageDocument = Image & Document;

@Schema({ timestamps: true })
export class Image {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Experiment', required: true })
  experimentId: Experiment;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: User;

  @Prop({ required: true })
  imageUrl: string;

  @Prop()
  originalFilename: string;

  @Prop()
  mimetype: string;

  @Prop({ default: 'pending' })
  processingStatus: string;

  @Prop({ default: '' })
  feedback: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ type: [Object], default: [] })
  detectedComponents: Record<string, any>[];

  @Prop()
  processedImageUrl: string;

  @Prop()
  reportByBot: string;

  @Prop()
  reportedPhoto: string;
}

export const ImageSchema = SchemaFactory.createForClass(Image);