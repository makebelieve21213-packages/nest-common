import { WsException } from "@nestjs/websockets";
import SocketError from "src/errors/socket.error";

import type { LoggerService } from "@makebelieve21213-packages/logger";
import type { ArgumentsHost } from "@nestjs/common";

// Обработчик WebSocket ошибок, извлеченный из фильтра для переиспользования
export default class WebSocketExceptionHandler {
	constructor(private readonly loggerService: LoggerService) {}

	// Обрабатывает WebSocket ошибку и отправляет ответ клиенту
	handleException(exception: Error | unknown, host: ArgumentsHost): void {
		// Устанавливаем контекст перед логированием
		this.loggerService.setContext(WebSocketExceptionHandler.name);

		const ctx = host.switchToWs();
		const client = ctx.getClient();

		// Преобразуем любую ошибку в SocketError
		const socketError = SocketError.fromUnknown(exception);

		// Определяем код ошибки
		let errorCode = "INTERNAL_ERROR";
		if (exception instanceof SocketError) {
			errorCode = "SOCKET_ERROR";
		} else if (exception instanceof WsException) {
			errorCode = "WS_EXCEPTION";
		} else if (exception instanceof Error) {
			errorCode = exception.constructor.name.toUpperCase();
		}

		// Создаем объект ошибки для отправки клиенту
		const errorResponse = {
			status: "error",
			message: socketError.getMessage(),
			code: errorCode,
			timestamp: new Date().toISOString(),
		};

		// Логируем подробности ошибки
		const errorMessage = exception instanceof Error ? exception.message : String(exception);
		const errorType = exception instanceof Error ? exception.constructor.name : typeof exception;

		this.loggerService.error(
			`WebSocket ${errorCode} — ${socketError.name} — ${errorResponse.message} [type: ${errorType}, original: ${errorMessage}]`
		);

		// Логируем stack trace отдельно, если он есть
		if (exception instanceof Error && exception.stack) {
			this.loggerService.error(`Stack trace: ${exception.stack}`);
		}

		// Отправляем ошибку клиенту
		client.emit("exception", errorResponse);
	}
}
