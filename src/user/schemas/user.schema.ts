import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Document, Types } from 'mongoose';
import { UserRole } from 'src/shared/enums/user.enum';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
    @ApiProperty({ example: '507f1f77bcf86cd799439011' })
    _id: Types.ObjectId;

    @ApiProperty({ example: 'user@example.com' })
    @Prop({ required: true, unique: true })
    email: string;

    @Prop({ required: true })
    password: string;

    @ApiProperty({ enum: UserRole, example: UserRole.STUDENT })
    @Prop({ default: UserRole.STUDENT, enum: UserRole })
    role: UserRole;
}

export const UserSchema = SchemaFactory.createForClass(User);
