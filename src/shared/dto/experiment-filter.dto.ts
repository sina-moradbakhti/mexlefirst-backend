import { PartialType } from '@nestjs/mapped-types';
import { FilterDto } from './filter.dto';

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ExperimentFilterDto extends PartialType(FilterDto) {
    @ApiPropertyOptional()
    @IsOptional()
    status?: string;
}