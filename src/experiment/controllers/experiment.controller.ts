
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ExperimentService } from '../experiment.service';
import { CreateExperimentDto } from '../dto/create-experiment.dto';
import { UpdateExperimentDto } from '../dto/update-experiment.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/shared/enums/user.enum';

@ApiTags('experiments')
@Controller('experiments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ExperimentController {
  constructor(private readonly experimentService: ExperimentService) { }

  @Post()
  @Roles(UserRole.INSTRUCTOR)
  @ApiOperation({
    summary: 'Create experiment [Instructor Only]',
    description: 'Creates a new experiment with the provided details. This endpoint is restricted to instructors only.'
  })
  @ApiResponse({ status: 201, description: 'Experiment successfully created' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden - User is not a student' })
  create(@Request() req, @Body() createExperimentDto: CreateExperimentDto) {
    createExperimentDto.instructorId = req.user.id;
    return this.experimentService.create(createExperimentDto);
  }

  @Get()
  @Roles(UserRole.STUDENT, UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({
    summary: 'Get user experiments [All Roles]',
    description: 'Retrieves all experiments associated with the authenticated user. Accessible by students, instructors, and admins.'
  })
  @ApiResponse({ status: 200, description: 'List of user experiments retrieved successfully' })
  findAll(@Request() req) {
    return this.experimentService.findByUserId(req.user.id);
  }

  @Get(':id')
  @Roles(UserRole.STUDENT, UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({
    summary: 'Get experiment by ID [All Roles]',
    description: 'Retrieves a specific experiment by its ID. Accessible by students, instructors, and admins.'
  })
  @ApiResponse({ status: 200, description: 'Experiment found' })
  @ApiResponse({ status: 404, description: 'Experiment not found' })
  findOne(@Param('id') id: string) {
    return this.experimentService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.INSTRUCTOR)
  @ApiOperation({
    summary: 'Update experiment [Instructor Only]',
    description: 'Updates an existing experiment with the provided details. This endpoint is restricted to instructors only.'
  })
  @ApiResponse({ status: 200, description: 'Experiment updated successfully' })
  @ApiResponse({ status: 404, description: 'Experiment not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - User is not a student' })
  update(
    @Param('id') id: string,
    @Body() updateExperimentDto: UpdateExperimentDto,
  ) {
    return this.experimentService.update(id, updateExperimentDto);
  }

  @Patch(':id/status')
  @Roles(UserRole.INSTRUCTOR)
  @ApiOperation({
    summary: 'Update experiment status [Instructor Only]',
    description: 'Updates the status of an existing experiment. This endpoint is restricted to instructors only.'
  })
  @ApiResponse({ status: 200, description: 'Experiment status updated successfully' })
  @ApiResponse({ status: 404, description: 'Experiment not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - User is not a student' })
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.experimentService.updateStatus(id, status);
  }

  @Delete(':id')
  @Roles(UserRole.INSTRUCTOR)
  @ApiOperation({
    summary: 'Delete experiment [Instructor Only]',
    description: 'Deletes an experiment by its ID. This endpoint is restricted to instructors only.'
  })
  @ApiResponse({ status: 200, description: 'Experiment deleted successfully' })
  @ApiResponse({ status: 404, description: 'Experiment not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - User is not a student' })
  remove(@Param('id') id: string) {
    return this.experimentService.remove(id);
  }
}
