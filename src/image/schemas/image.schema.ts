import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Experiment } from '../../experiment/schemas/experiment.schema';

export type ImageDocument = Image & Document;

@Schema({ timestamps: true })
export class Image {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Experiment', required: true })
  experimentId: Experiment;

  @Prop({ required: true })
  imageUrl: string;

  @Prop()
  originalFilename: string;

  @Prop({ default: 'pending' })
  processingStatus: string;

  @Prop({ type: [Object], default: [] })
  detectedComponents: Record<string, any>[];
}

export const ImageSchema = SchemaFactory.createForClass(Image);