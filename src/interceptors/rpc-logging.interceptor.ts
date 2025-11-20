import { throwError } from "rxjs";
import { catchError, tap } from "rxjs/operators";

import type { LoggerService } from "@makebelieve21213-packages/logger";
import type { CallHandler, ExecutionContext } from "@nestjs/common";
import type { RmqContext } from "@nestjs/microservices";
import type { Observable } from "rxjs";

// Перехватчик для логирования RPC запросов
export default class RpcLoggingInterceptor {
	constructor(private readonly loggerService: LoggerService) {}

	// Обрабатывает RPC запрос и логирует его выполнение
	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const rpcContext = context.switchToRpc().getContext<RmqContext>();

		const pattern = rpcContext.getPattern() || "unknown";
		const startTime = Date.now();

		// Устанавливаем контекст перед логированием
		this.loggerService.setContext(RpcLoggingInterceptor.name);

		// Логируем входящий запрос
		this.loggerService.log(`[RPC] Incoming request [pattern: ${pattern}]`);

		// Перехватываем выполнение и логируем результат
		return next.handle().pipe(
			tap(() => {
				const duration = Date.now() - startTime;
				this.loggerService.log(
					`[RPC] Request completed [pattern: ${pattern}, duration: ${duration}ms]`
				);
			}),
			catchError((error: Error | unknown) => {
				const duration = Date.now() - startTime;
				const errorMessage = error instanceof Error ? error.message : String(error);

				this.loggerService.error(
					`[RPC] Request failed [pattern: ${pattern}, duration: ${duration}ms, error: ${errorMessage}]`
				);

				// Пробрасываем ошибку дальше для обработки фильтром
				return throwError(() => error);
			})
		);
	}
}
