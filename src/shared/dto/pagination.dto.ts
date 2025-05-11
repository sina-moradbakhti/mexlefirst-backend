import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
    @ApiPropertyOptional({ default: 1, minimum: 1 })
    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ default: 10, minimum: 1 })
    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    @Min(1)
    limit?: number = 10;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    pages: number;
}