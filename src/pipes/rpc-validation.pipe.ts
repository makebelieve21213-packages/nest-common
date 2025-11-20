import { Injectable, PipeTransform } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

import type { Type } from "@nestjs/common";
import type { MessageWithCorrelationId } from "src/types/rpc-types";

// Валидация DTO с использованием class-validator для RabbitMQ микросервисов
@Injectable()
export default class RpcValidationPipe<T extends object> implements PipeTransform<T> {
	constructor(private readonly dtoClass: Type<T>) {}

	async transform(value: T) {
		// Обрабатываем случаи, когда value может быть undefined или null
		// Для пустых DTO (без полей) передаем пустой объект
		const normalizedValue = value ?? ({} as T);

		// Извлекаем correlationId и correlationTimestamp из сообщения (если они есть)
		// чтобы они не попали в DTO при валидации
		// Префикс _ указывает, что переменные намеренно не используются
		const {
			correlationId: _correlationId,
			correlationTimestamp: _correlationTimestamp,
			...dtoData
		} = normalizedValue as MessageWithCorrelationId & T;

		const dto = plainToInstance(this.dtoClass, dtoData as T, {
			enableImplicitConversion: true,
		});

		const errors = await validate(dto, {
			whitelist: true,
			forbidNonWhitelisted: true,
		});

		if (errors.length) {
			const messages = errors
				.map((err) => Object.values(err.constraints || {}).join("; "))
				.join("; ");
			throw new RpcException(`Validation failed: ${messages}`);
		}

		return dto;
	}
}
