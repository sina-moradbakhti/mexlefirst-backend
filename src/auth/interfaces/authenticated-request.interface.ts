import { Request } from 'express';
import { UserRole } from '../../shared/enums/user.enum';

export interface AuthenticatedUser {
    id: string;
    email: string;
    role: UserRole;
}

export interface AuthenticatedRequest extends Request {
    user: AuthenticatedUser;
}