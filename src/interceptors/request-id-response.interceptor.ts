import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { getRequestIdFromContext } from "src/utils/context.utils";

// Interceptor для добавления Request ID в заголовки ответов
@Injectable()
export default class RequestIdResponseInterceptor implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const requestId = getRequestIdFromContext(context);
		const response = context.switchToHttp().getResponse();

		return next.handle().pipe(
			tap(() => {
				// Добавляем Request ID в заголовки ответа
				if (requestId && requestId !== "unknown") {
					response.setHeader("X-Request-ID", requestId);
				}
			})
		);
	}
}
