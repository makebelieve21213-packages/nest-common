import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

import type { StandardResponse } from "src/types/http-response";

// Interceptor для стандартизации формата HTTP ответов
@Injectable()
export default class ResponseInterceptor<T> implements NestInterceptor<T, StandardResponse<T>> {
	constructor() {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<StandardResponse<T>> {
		const request = context.switchToHttp().getRequest();
		const path = request.url || request.path;
		const requestId = request.headers["x-request-id"] || request.id || undefined;

		return next.handle().pipe(
			map((data) => {
				// Если ответ уже в стандартном формате, возвращаем как есть
				if (data && typeof data === "object" && "success" in data && "data" in data) {
					return data as StandardResponse<T>;
				}

				// Формируем стандартизированный ответ
				return {
					success: true,
					data: data as T,
					meta: {
						timestamp: new Date().toISOString(),
						path,
						requestId,
					},
				};
			})
		);
	}
}
