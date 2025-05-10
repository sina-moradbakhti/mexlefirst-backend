import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../user/schemas/user.schema';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { DuplicateKeysException } from 'src/shared/errors/duplicate-keys.exception';

export type ExperimentDocument = Experiment & Document;

@Schema({ timestamps: true })
export class Experiment {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  instructorId: User;

  @Prop({ required: true, unique: true })
  experimentId: string;

  @Prop({ required: true })
  experimentType: string;

  @Prop()
  description: string;

  @Prop({ default: 'active' })
  status: string;
}

export const ExperimentSchema = SchemaFactory.createForClass(Experiment);

ExperimentSchema.post('save', function (error, doc, next) {
  if (error.name === 'MongoServerError' && error.code === 11000) {
    next(new DuplicateKeysException('ExperimentId'));
  } else {
    next(error);
  }
});

ExperimentSchema.post('insertMany', function (error, docs, next) {
  if (error.name === 'MongoServerError' && error.code === 11000) {
    next(new DuplicateKeysException('ExperimentId'));
  } else {
    next(error);
  }
});