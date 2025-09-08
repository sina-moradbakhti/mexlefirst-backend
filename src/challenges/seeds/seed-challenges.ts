import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { ChallengesService } from '../services/challenges.service';
import { challengeSeeds } from './challenges.seed';
import { Model } from 'mongoose';
import { Challenge, ChallengeDocument } from '../schemas/challenge.schema';
import { getModelToken } from '@nestjs/mongoose';

async function seedChallenges() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const challengeModel = app.get<Model<ChallengeDocument>>(getModelToken(Challenge.name));
    
    // Clear existing challenges
    await challengeModel.deleteMany({});
    console.log('Cleared existing challenges');
    
    // Insert new challenges
    await challengeModel.insertMany(challengeSeeds);
    console.log(`Seeded ${challengeSeeds.length} challenges successfully`);
    
  } catch (error) {
    console.error('Error seeding challenges:', error);
  } finally {
    await app.close();
  }
}

seedChallenges();