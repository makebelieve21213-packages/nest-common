import { throwError } from "rxjs";
import { catchError, tap } from "rxjs/operators";
import SocketError from "src/errors/socket.error";

import type { LoggerService } from "@makebelieve21213-packages/logger";
import type { CallHandler, ExecutionContext } from "@nestjs/common";
import type { Observable } from "rxjs";

// Перехватчик для логирования WebSocket запросов
export default class WebSocketLoggingInterceptor {
	constructor(private readonly loggerService: LoggerService) {}

	// Обрабатывает WebSocket запрос и логирует его выполнение
	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const wsContext = context.switchToWs();
		const client = wsContext.getClient();
		const pattern = wsContext.getPattern() || "unknown";

		const clientId = (client as { id?: string }).id || "unknown";
		const startTime = Date.now();

		// Устанавливаем контекст перед логированием
		this.loggerService.setContext(WebSocketLoggingInterceptor.name);

		// Логируем входящее событие
		this.loggerService.log(`[WS] Incoming event [pattern: ${pattern}] from client [${clientId}]`);

		// Перехватываем выполнение и логируем результат
		return next.handle().pipe(
			tap(() => {
				const duration = Date.now() - startTime;
				this.loggerService.log(
					`[WS] Event completed [pattern: ${pattern}, client: ${clientId}, duration: ${duration}ms]`
				);
			}),
			catchError((error: Error | unknown) => {
				const duration = Date.now() - startTime;
				// Преобразуем ошибку в SocketError для извлечения сообщения
				const socketError = SocketError.fromUnknown(error);
				const errorMessage = socketError.getMessage();

				this.loggerService.error(
					`[WS] Event failed [pattern: ${pattern}, client: ${clientId}, duration: ${duration}ms] - ${errorMessage}`
				);

				// Пробрасываем ошибку дальше для обработки фильтром
				return throwError(() => error);
			})
		);
	}
}
