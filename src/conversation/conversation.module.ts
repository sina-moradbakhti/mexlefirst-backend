import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ConversationController } from './controllers/conversation.controller';
import { ConversationService } from './services/conversation.service';
import { ConversationGateway } from './gateways/conversation.gateway';
import { Conversation, ConversationSchema } from './schemas/conversation.schema';
import { Experiment, ExperimentSchema } from '../experiment/schemas/experiment.schema';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: Experiment.name, schema: ExperimentSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
    UserModule,
  ],
  controllers: [ConversationController],
  providers: [ConversationService, ConversationGateway],
  exports: [ConversationService, ConversationGateway],
})
export class ConversationModule {}