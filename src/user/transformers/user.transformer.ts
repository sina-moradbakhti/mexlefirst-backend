import { UserDocument } from '../schemas/user.schema';
import { UserResponse } from '../interfaces/user-response.interface';

export class UserTransformer {
    static toResponse(user: UserDocument): UserResponse {
        return {
            id: user._id.toString(),
            email: user.email,
            role: user.role,
        };
    }

    static toResponseList(users: UserDocument[]): UserResponse[] {
        return users.map(user => this.toResponse(user));
    }
}