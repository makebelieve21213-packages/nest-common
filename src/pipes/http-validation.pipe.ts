import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

import type { Type } from "@nestjs/common";

// Валидация DTO с использованием class-validator для HTTP контроллеров
@Injectable()
export default class HttpValidationPipe<T extends object> implements PipeTransform<T> {
	constructor(private readonly dtoClass: Type<T>) {}

	async transform(value: T) {
		const dto = plainToInstance(this.dtoClass, value, {
			enableImplicitConversion: true,
		});

		const errors = await validate(dto, {
			whitelist: true,
			forbidNonWhitelisted: true,
		});

		if (errors.length) {
			const messages = errors.map((err) => Object.values(err.constraints || {}).join("; ")).join("; ");
			throw new BadRequestException(`Validation failed: ${messages}`);
		}

		return dto;
	}
}
