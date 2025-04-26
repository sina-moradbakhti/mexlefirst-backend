import { UserRole } from '../../shared/enums/user.enum';

export interface UserResponse {
    id: string;
    email: string;
    role: UserRole;
}