import { HttpStatus } from "@nestjs/common";
import HttpError from "src/errors/http.error";
import { extractRpcCode, extractRpcMessage } from "src/utils/error-extract.utils";
import stringifyForLog from "src/utils/stringify";

import type { LoggerService } from "@makebelieve21213-packages/logger";
import type { ArgumentsHost } from "@nestjs/common";
import type { Request, Response } from "express";

// Обработчик HTTP ошибок, извлеченный из фильтра для переиспользования
export default class HttpExceptionFilter {
	constructor(
		private readonly loggerService: LoggerService,
		private readonly rpcCodeToHttpStatus?: (code: string | undefined) => number | undefined
	) {}

	// Обрабатывает HTTP ошибку и отправляет ответ клиенту
	handleException(exception: unknown, host: ArgumentsHost): void {
		this.loggerService.setContext(HttpExceptionFilter.name);

		const ctx = host.switchToHttp();
		const response = ctx.getResponse<Response>();
		const request = ctx.getRequest<Request>();

		const code = extractRpcCode(exception);
		const httpError = HttpError.fromUnknown(exception);

		// Если передан маппер и найден RPC-код — используем маппинг, иначе берём статус из httpError
		const mappedStatus = this.rpcCodeToHttpStatus?.(code);
		const status =
			mappedStatus !== undefined && mappedStatus !== HttpStatus.INTERNAL_SERVER_ERROR
				? mappedStatus
				: httpError.getStatus();

		const message =
			extractRpcMessage(exception) ??
			(typeof httpError.message === "string" ? httpError.message : stringifyForLog(httpError.message));

		const errorResponse: Record<string, unknown> = {
			statusCode: status,
			timestamp: new Date().toISOString(),
			path: request.url,
			error: httpError.name,
			message,
		};

		if (code) {
			errorResponse.code = code;
		}

		if (exception instanceof Error && exception.stack) {
			errorResponse.stack = exception.stack;
		}

		// Логирование
		let errorMessage: string;
		if (exception instanceof Error) {
			const msg = exception.message;
			errorMessage =
				msg === "[object Object]" && "getResponse" in exception
					? stringifyForLog((exception as { getResponse?: () => unknown }).getResponse?.())
					: typeof msg === "string"
						? msg
						: stringifyForLog(msg);
		} else {
			errorMessage = stringifyForLog(exception);
		}

		const errorType = exception instanceof Error ? exception.constructor.name : typeof exception;
		const path = request?.url ?? request?.path ?? "unknown";
		const logMessage = `HTTP ${status} — ${httpError.name} — ${message} [path: ${path}, type: ${errorType}, original: ${errorMessage}]`;

		// 401 — ожидаемая ситуация, логируем кратко
		if (status === HttpStatus.UNAUTHORIZED) {
			this.loggerService.warn(logMessage);
		} else {
			this.loggerService.error(logMessage);
			if (exception instanceof Error && exception.stack) {
				this.loggerService.error(`Stack trace: ${exception.stack}`);
			}
		}

		response.status(status).json(errorResponse);
	}
}
