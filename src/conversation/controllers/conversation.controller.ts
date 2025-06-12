import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Patch,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ConversationService } from '../services/conversation.service';
import { CreateConversationDto } from '../dto/create-conversation.dto';
import { SendMessageDto } from '../dto/send-message.dto';
import { ConversationQueryDto } from '../dto/conversation-query.dto';
import { ConversationListResponseDto, ConversationResponseDto } from '../dto/conversation-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../shared/enums/user.enum';
import { ParticipantType, ConversationStatus } from '../../shared/enums/conversation.enum';

@ApiTags('Conversations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('conversations')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Post()
  @Roles(UserRole.STUDENT, UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new conversation' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Conversation created successfully',
    type: ConversationResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input or conversation already exists' })
  async createConversation(
    @Body() createConversationDto: CreateConversationDto,
    @Request() req: any,
  ): Promise<ConversationResponseDto> {
    return this.conversationService.createConversation(createConversationDto, req.user.id);
  }

  @Post(':id/messages')
  @Roles(UserRole.STUDENT, UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Send a message in a conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Message sent successfully',
    type: ConversationResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Conversation not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not authorized to send message in this conversation' })
  async sendMessage(
    @Param('id') conversationId: string,
    @Body() sendMessageDto: SendMessageDto,
    @Request() req: any,
  ): Promise<ConversationResponseDto> {
    const senderType = this.mapUserRoleToParticipantType(req.user.role);
    return this.conversationService.sendMessage(conversationId, sendMessageDto, req.user.id, senderType);
  }

  @Get('student/:studentId')
  @Roles(UserRole.STUDENT, UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get conversations for a specific student' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Student conversations retrieved successfully',
    type: ConversationListResponseDto,
  })
  async getStudentConversations(
    @Param('studentId') studentId: string,
    @Query() query: ConversationQueryDto,
    @Request() req: any,
  ): Promise<ConversationListResponseDto> {
    // Students can only view their own conversations unless they're admin/instructor
    if (req.user.role === UserRole.STUDENT && req.user.id !== studentId) {
      throw new Error('Students can only view their own conversations');
    }
    
    return this.conversationService.getConversationsByStudent(studentId, query);
  }

  @Get('instructor/:instructorId')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get conversations for a specific instructor' })
  @ApiParam({ name: 'instructorId', description: 'Instructor ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Instructor conversations retrieved successfully',
    type: ConversationListResponseDto,
  })
  async getInstructorConversations(
    @Param('instructorId') instructorId: string,
    @Query() query: ConversationQueryDto,
    @Request() req: any,
  ): Promise<ConversationListResponseDto> {
    // Instructors can only view their own conversations unless they're admin
    if (req.user.role === UserRole.INSTRUCTOR && req.user.id !== instructorId) {
      throw new Error('Instructors can only view their own conversations');
    }
    
    return this.conversationService.getConversationsByInstructor(instructorId, query);
  }

  @Get('between/:studentId/:instructorId')
  @Roles(UserRole.STUDENT, UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get conversations between a student and instructor' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiParam({ name: 'instructorId', description: 'Instructor ID' })
  @ApiQuery({ name: 'experimentId', required: false, description: 'Filter by experiment ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Conversations retrieved successfully',
    type: [ConversationResponseDto],
  })
  async getConversationBetweenStudentAndInstructor(
    @Request() req: any,
    @Param('studentId') studentId: string,
    @Param('instructorId') instructorId: string,
    @Query('experimentId') experimentId?: string,
  ): Promise<ConversationResponseDto[]> {
    // Verify user has permission to view these conversations
    if (req.user.role === UserRole.STUDENT && req.user.id !== studentId) {
      throw new Error('Students can only view their own conversations');
    }
    if (req.user.role === UserRole.INSTRUCTOR && req.user.id !== instructorId) {
      throw new Error('Instructors can only view their own conversations');
    }
    
    return this.conversationService.getConversationBetweenStudentAndInstructor(
      studentId,
      instructorId,
      experimentId,
    );
  }

  @Get(':id')
  @Roles(UserRole.STUDENT, UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get a specific conversation by ID' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Conversation retrieved successfully',
    type: ConversationResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Conversation not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not authorized to view this conversation' })
  async getConversationById(
    @Param('id') conversationId: string,
    @Request() req: any,
  ): Promise<ConversationResponseDto> {
    return this.conversationService.getConversationById(conversationId, req.user.id, req.user.role);
  }

  @Patch(':id/read')
  @Roles(UserRole.STUDENT, UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Mark messages in a conversation as read' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Messages marked as read successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Conversation not found' })
  async markMessagesAsRead(
    @Param('id') conversationId: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    await this.conversationService.markMessagesAsRead(conversationId, req.user.id);
    return { message: 'Messages marked as read successfully' };
  }

  @Patch(':id/status')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update conversation status' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Conversation status updated successfully',
    type: ConversationResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Conversation not found' })
  async updateConversationStatus(
    @Param('id') conversationId: string,
    @Body('status') status: ConversationStatus,
    @Request() req: any,
  ): Promise<ConversationResponseDto> {
    return this.conversationService.updateConversationStatus(conversationId, status);
  }

  @Get('my/conversations')
  @Roles(UserRole.STUDENT, UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get current user\'s conversations' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User conversations retrieved successfully',
    type: ConversationListResponseDto,
  })
  async getMyConversations(
    @Query() query: ConversationQueryDto,
    @Request() req: any,
  ): Promise<ConversationListResponseDto> {
    if (req.user.role === UserRole.STUDENT) {
      return this.conversationService.getConversationsByStudent(req.user.id, query);
    } else if (req.user.role === UserRole.INSTRUCTOR) {
      return this.conversationService.getConversationsByInstructor(req.user.id, query);
    } else {
      // For admin, we might want to implement a different method to get all conversations
      // For now, return empty result
      return {
        conversations: [],
        total: 0,
        page: query.page || 1,
        limit: query.limit || 10,
        totalPages: 0,
      };
    }
  }

  private mapUserRoleToParticipantType(userRole: UserRole): ParticipantType {
    switch (userRole) {
      case UserRole.STUDENT:
        return ParticipantType.STUDENT;
      case UserRole.INSTRUCTOR:
        return ParticipantType.INSTRUCTOR;
      case UserRole.ADMIN:
        return ParticipantType.ADMIN;
      default:
        throw new Error('Invalid user role');
    }
  }
}