import { ConflictException } from '@nestjs/common';

export class DuplicateKeysException extends ConflictException {
    constructor(colName: string) {
        super(`${colName} must be unique.`);
    }
}