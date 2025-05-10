import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../user/schemas/user.schema';

export type ExperimentDocument = Experiment & Document;

@Schema({ timestamps: true })
export class Experiment {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  instructorId: User;

  @Prop({ required: true })
  experimentId: string;

  @Prop({ required: true })
  experimentType: string;

  @Prop()
  description: string;

  @Prop({ default: 'submitted' })
  status: string;
}

export const ExperimentSchema = SchemaFactory.createForClass(Experiment);