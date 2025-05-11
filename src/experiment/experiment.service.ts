import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Experiment, ExperimentDocument } from './schemas/experiment.schema';
import { CreateExperimentDto } from './dto/create-experiment.dto';
import { UpdateExperimentDto } from './dto/update-experiment.dto';
import { DuplicateKeysException } from 'src/shared/errors/duplicate-keys.exception';
import { FilterDto, PaginatedResponse } from 'src/shared/dto/filter.dto';
import { ExperimentFilterDto } from 'src/shared/dto/experiment-filter.dto';

@Injectable()
export class ExperimentService {
  constructor(
    @InjectModel(Experiment.name) private experimentModel: Model<ExperimentDocument>,
  ) { }

  async create(createExperimentDto: CreateExperimentDto): Promise<Experiment> {
    try {
      const createdExperiment = new this.experimentModel({
        experimentId: createExperimentDto.experimentId,
        experimentType: createExperimentDto.experimentType,
        description: createExperimentDto.description,
        instructorId: createExperimentDto.instructorId,
      });
      return createdExperiment.save();
    } catch (error) {
      console.log(error);
      throw new DuplicateKeysException('ExperimentId');
    }
  }

  async findAll(filter: ExperimentFilterDto): Promise<PaginatedResponse<ExperimentDocument>> {
    const query = {};

    if (filter.status) {
      query['status'] = filter.status;
    }

    if (
      filter.search &&
      filter.searchBy &&
      ['experimentId'].includes(filter.searchBy)
    ) {
      query[filter.searchBy] = {
        $regex: filter.search,
        $options: 'i',
      };
    }

    const skip = (filter.page - 1) * filter.limit;

    const [items, total] = await Promise.all([
      this.experimentModel
        .find(query)
        .skip(skip)
        .limit(filter.limit)
        .exec(),
      this.experimentModel.countDocuments(query).exec(),
    ]);

    const pages = Math.ceil(total / filter.limit);

    return {
      data: items,
      total,
      page: filter.page,
      limit: filter.limit,
      pages,
    };
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