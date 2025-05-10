import { BadRequestException } from '@nestjs/common';

export class UnsupportedFileTypeException extends BadRequestException {
    constructor() {
        super('Only image files are allowed! [jpg, jpeg, png]');
    }
}