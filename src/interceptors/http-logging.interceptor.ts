import { HttpStatus } from "@nestjs/common";
import { throwError } from "rxjs";
import { catchError, tap } from "rxjs/operators";
import HttpError from "src/errors/http.error";
import stringifyForLog from "src/utils/stringify";

import type { LoggerService } from "@makebelieve21213-packages/logger";
import type { CallHandler, ExecutionContext } from "@nestjs/common";
import type { Request, Response } from "express";
import type { Observable } from "rxjs";

// Перехватчик для логирования HTTP запросов
export default class HttpLoggingInterceptor {
	constructor(private readonly loggerService: LoggerService) {}

	// Обрабатывает HTTP запрос и логирует его выполнение
	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const httpContext = context.switchToHttp();
		const request = httpContext.getRequest<Request>();
		const response = httpContext.getResponse<Response>();

		const method = request.method || "UNKNOWN";
		const url = request.url || request.originalUrl || "/unknown";
		const userAgent = request.get("user-agent") || "unknown";
		const ip = request.ip || request.socket.remoteAddress || "unknown";
		const startTime = Date.now();

		// Устанавливаем контекст перед логированием
		this.loggerService.setContext(HttpLoggingInterceptor.name);

		// Логируем входящий запрос
		this.loggerService.log(`[HTTP] Incoming request [${method} ${url}] from ${ip} (${userAgent})`);

		// Перехватываем выполнение и логируем результат
		return next.handle().pipe(
			tap(() => {
				const duration = Date.now() - startTime;
				const statusCode = response.statusCode || HttpStatus.OK;

				this.loggerService.log(
					`[HTTP] Request completed [${method} ${url}] ${statusCode} ${duration}ms`
				);
			}),
			catchError((error: unknown) => {
				const duration = Date.now() - startTime;
				const httpError = HttpError.fromUnknown(error);
				const statusCode = httpError.getStatus();
				const message =
					typeof httpError.message === "string" ? httpError.message : stringifyForLog(httpError.message);
				this.loggerService.error(
					`[HTTP] Request failed [${method} ${url}] ${statusCode} ${duration}ms - ${message}`
				);
				return throwError(() => error);
			})
		);
	}
}
