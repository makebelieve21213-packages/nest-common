import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { plainToInstance } from "class-transformer";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { SERIALIZE_KEY } from "src/decorators/serialize.decorator";

// Interceptor для сериализации ответов с исключением чувствительных данных
@Injectable()
export default class SerializeInterceptor implements NestInterceptor {
	constructor(private readonly reflector: Reflector) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		// Получаем DTO класс из метаданных
		const dto = this.reflector.getAllAndOverride<unknown>(SERIALIZE_KEY, [
			context.getHandler(),
			context.getClass(),
		]);

		if (!dto) {
			return next.handle();
		}

		return next.handle().pipe(
			map((data) => {
				// Сериализуем данные используя DTO класс
				if (Array.isArray(data)) {
					return data.map((item) =>
						plainToInstance(dto as new () => unknown, item, {
							excludeExtraneousValues: true,
						})
					);
				}

				return plainToInstance(dto as new () => unknown, data, {
					excludeExtraneousValues: true,
				});
			})
		);
	}
}
