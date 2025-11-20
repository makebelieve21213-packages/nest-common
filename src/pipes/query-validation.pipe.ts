import {
	ArgumentMetadata,
	Injectable,
	PipeTransform,
	BadRequestException,
	HttpStatus,
} from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate, ValidationError } from "class-validator";

// Pipe для валидации query параметров
@Injectable()
export default class QueryValidationPipe implements PipeTransform {
	constructor(private readonly dtoClass: new () => unknown) {}

	async transform(value: unknown, metadata: ArgumentMetadata): Promise<unknown> {
		if (metadata.type !== "query") {
			return value;
		}

		if (!this.dtoClass) {
			return value;
		}

		// Преобразуем plain object в DTO класс
		const dto = plainToInstance(this.dtoClass, value);

		// Валидируем
		const errors = await validate(dto as object);

		if (errors.length) {
			const errorMessages = this.formatErrors(errors);
			throw new BadRequestException({
				statusCode: HttpStatus.BAD_REQUEST,
				message: "Validation failed",
				errors: errorMessages,
			});
		}

		return dto;
	}

	private formatErrors(errors: ValidationError[]): string[] {
		const messages: string[] = [];

		errors.forEach((error) => {
			if (error.constraints) {
				messages.push(...Object.values(error.constraints));
			}

			if (error.children && error.children.length > 0) {
				messages.push(...this.formatErrors(error.children));
			}
		});

		return messages;
	}
}
