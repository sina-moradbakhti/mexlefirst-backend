import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChallengesController } from './controllers/challenges.controller';
import { InstructorChallengesController } from './controllers/instructor-challenges.controller';
import { ChallengesService } from './services/challenges.service';
import { Challenge, ChallengeSchema } from './schemas/challenge.schema';
import { UserChallengeProgress, UserChallengeProgressSchema } from './schemas/user-challenge-progress.schema';
import { ImageModule } from '../image/image.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Challenge.name, schema: ChallengeSchema },
            { name: UserChallengeProgress.name, schema: UserChallengeProgressSchema },
        ]),
        ImageModule,
    ],
    controllers: [ChallengesController, InstructorChallengesController],
    providers: [ChallengesService],
    exports: [ChallengesService],
})
export class ChallengesModule { }