import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExperimentController } from './controllers/experiment.controller';
import { ExperimentService } from './experiment.service';
import { Experiment, ExperimentSchema } from './schemas/experiment.schema';
import { InstructorExperimentController } from './controllers/instructor-experiment.controller';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Experiment.name, schema: ExperimentSchema },
        ]),
    ],
    controllers: [
        ExperimentController,
        InstructorExperimentController,
    ],
    providers: [ExperimentService],
    exports: [ExperimentService],
})
export class ExperimentModule { }
