import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExperimentController } from './experiment.controller';
import { ExperimentService } from './experiment.service';
import { Experiment, ExperimentSchema } from './schemas/experiment.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Experiment.name, schema: ExperimentSchema },
        ]),
    ],
    controllers: [ExperimentController],
    providers: [ExperimentService],
    exports: [ExperimentService],
})
export class ExperimentModule { }
