import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UserRole } from 'src/shared/enums/user.enum';
import { PaginationDto, PaginatedResponse } from '../shared/dto/pagination.dto';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UserService {
    constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) { }

    /**
     * Find a user by their email address
     * @param email The email address to search for
     * @returns The user document if found, null otherwise
     */
    async findByEmail(email: string): Promise<UserDocument | null> {
        return this.userModel.findOne({ email }).exec();
    }

    /**
     * Find a user by their ID
     * @param id The user's ID
     * @returns The user document
     * @throws NotFoundException if user is not found
     */
    async findById(id: string): Promise<UserDocument> {
        const user = await this.userModel.findById(id).exec();

        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        return user;
    }

    async create(user: CreateUserDto): Promise<UserDocument> {
        const newUser = new this.userModel(user);
        return newUser.save();
    }

    async findOne(id: string): Promise<UserDocument> {
        return this.userModel.findById(id).exec();
    }

    /**
     * Find all users with pagination support
     * @param userRole Optional role to filter users
     * @param pagination Pagination parameters
     * @returns Paginated response containing users and pagination metadata
     */
    async findAll(
        userRole: UserRole = null,
        pagination: PaginationDto = new PaginationDto()
    ): Promise<PaginatedResponse<UserDocument>> {
        const query = {};

        if (userRole) {
            query['role'] = userRole;
        }

        const skip = (pagination.page - 1) * pagination.limit;

        const [items, total] = await Promise.all([
            this.userModel
                .find(query)
                .skip(skip)
                .limit(pagination.limit)
                .exec(),
            this.userModel.countDocuments(query).exec(),
        ]);

        const pages = Math.ceil(total / pagination.limit);

        return {
            data: items,
            total,
            page: pagination.page,
            limit: pagination.limit,
            pages,
        };
    }

    async isThereAnyAdmin(): Promise<UserDocument> {
        return this.userModel.findOne({
            role: 'admin',
        }).exec();
    }
}
