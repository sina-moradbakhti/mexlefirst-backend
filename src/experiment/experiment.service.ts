import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Experiment, ExperimentDocument } from './schemas/experiment.schema';
import { CreateExperimentDto } from './dto/create-experiment.dto';
import { UpdateExperimentDto } from './dto/update-experiment.dto';

@Injectable()
export class ExperimentService {
  constructor(
    @InjectModel(Experiment.name) private experimentModel: Model<ExperimentDocument>,
  ) {}

  async create(createExperimentDto: CreateExperimentDto): Promise<Experiment> {
    const createdExperiment = new this.experimentModel(createExperimentDto);
    return createdExperiment.save();
  }

  async findAll(): Promise<Experiment[]> {
    return this.experimentModel.find().exec();
  }

  async findOne(id: string): Promise<Experiment> {
    return this.experimentModel.findById(id).exec();
  }

  async findByUserId(userId: string): Promise<Experiment[]> {
    return this.experimentModel.find({ userId }).exec();
  }

  async update(id: string, updateExperimentDto: UpdateExperimentDto): Promise<Experiment> {
    return this.experimentModel
      .findByIdAndUpdate(id, updateExperimentDto, { new: true })
      .exec();
  }

  async updateStatus(id: string, status: string): Promise<Experiment> {
    return this.experimentModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .exec();
  }

  async remove(id: string): Promise<Experiment> {
    return this.experimentModel.findByIdAndDelete(id).exec();
  }
}