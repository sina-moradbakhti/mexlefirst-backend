import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserService } from './user.service';
import { UserController } from './controllers/user.controller';
import { User, UserSchema } from './schemas/user.schema';
import { InstructorUserController } from './controllers/instructor-user.controller';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])
    ],
    controllers: [
        UserController,
        InstructorUserController,
    ],
    providers: [UserService],
    exports: [UserService],
})
export class UserModule { }