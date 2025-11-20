import HttpError from "src/errors/http.error";

import type { LoggerService } from "@makebelieve21213-packages/logger";
import type { ArgumentsHost } from "@nestjs/common";
import type { Request, Response } from "express";
import type ErrorResponse from "src/types/http-response";

// Обработчик HTTP ошибок, извлеченный из фильтра для переиспользования
export default class HttpExceptionFilter {
	constructor(private readonly loggerService: LoggerService) {}

	// Обрабатывает HTTP ошибку и отправляет ответ клиенту
	handleException(exception: Error | unknown, host: ArgumentsHost): void {
		// Устанавливаем контекст перед логированием
		this.loggerService.setContext(HttpExceptionFilter.name);

		const ctx = host.switchToHttp();
		const response = ctx.getResponse<Response>();
		const request = ctx.getRequest<Request>();

		// Преобразуем любую ошибку в HttpError
		const httpError = HttpError.fromUnknown(exception);

		// Создаем объект ошибки для отправки на фронт
		const errorResponse: ErrorResponse = {
			statusCode: httpError.getStatus(),
			timestamp: new Date().toISOString(),
			path: request.url,
			error: httpError.name,
			message: httpError.message,
			...(exception instanceof Error && exception.stack ? { stack: exception.stack } : {}),
		};

		// Логируем подробности ошибки
		const errorMessage = exception instanceof Error ? exception.message : String(exception);
		const errorType = exception instanceof Error ? exception.constructor.name : typeof exception;

		this.loggerService.error(
			`HTTP ${errorResponse.statusCode} — ${errorResponse.error} — ${errorResponse.message} [type: ${errorType}, original: ${errorMessage}]`
		);

		// Логируем stack trace отдельно, если он есть
		if (exception instanceof Error && exception.stack) {
			this.loggerService.error(`Stack trace: ${exception.stack}`);
		}

		response.status(errorResponse.statusCode).json(errorResponse);
	}
}
