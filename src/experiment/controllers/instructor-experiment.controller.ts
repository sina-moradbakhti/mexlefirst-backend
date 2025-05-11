
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
  Query,
} from '@nestjs/common';
import { ExperimentService } from '../experiment.service';
import { CreateExperimentDto } from '../dto/create-experiment.dto';
import { UpdateExperimentDto } from '../dto/update-experiment.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/shared/enums/user.enum';
import { FilterDto } from 'src/shared/dto/filter.dto';
import { ExperimentFilterDto } from 'src/shared/dto/experiment-filter.dto';

@ApiTags('Instructor Experiments')
@Controller('instructor/experiments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class InstructorExperimentController {
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
  @Roles(UserRole.INSTRUCTOR)
  @ApiOperation({
    summary: 'Get user experiments [Instructor Only]',
  })
  @ApiResponse({ status: 200, description: 'List of experiments retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Instructor access required.' })
  findAll(
    @Query() filterDto: ExperimentFilterDto,
  ) {
    return this.experimentService.findAll(filterDto);
  }
}
