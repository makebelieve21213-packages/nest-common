import { HttpStatus, HttpException } from "@nestjs/common";
import { of, throwError } from "rxjs";
import HttpError from "src/errors/http.error";
import HttpLoggingInterceptor from "src/interceptors/http-logging.interceptor";

import type { LoggerService } from "@makebelieve21213-packages/logger";
import type { ExecutionContext } from "@nestjs/common";
import type { Request, Response } from "express";

describe("HttpLoggingInterceptor", () => {
	let handler: HttpLoggingInterceptor;
	let loggerService: jest.Mocked<LoggerService>;
	let executionContext: jest.Mocked<ExecutionContext>;
	let callHandler: { handle: jest.Mock };
	let mockRequest: Partial<Request>;
	let mockResponse: Partial<Response>;

	beforeEach(() => {
		loggerService = {
			log: jest.fn(),
			error: jest.fn(),
			warn: jest.fn(),
			debug: jest.fn(),
			setContext: jest.fn(),
		} as unknown as jest.Mocked<LoggerService>;

		handler = new HttpLoggingInterceptor(loggerService);

		mockRequest = {
			method: "GET",
			url: "/api/test",
			originalUrl: "/api/test",
			ip: "127.0.0.1",
			socket: {
				remoteAddress: "127.0.0.1",
			} as unknown as Request["socket"],
			get: jest.fn().mockReturnValue("test-user-agent"),
		};

		mockResponse = {
			statusCode: HttpStatus.OK,
		};

		executionContext = {
			switchToHttp: jest.fn().mockReturnValue({
				getRequest: jest.fn().mockReturnValue(mockRequest),
				getResponse: jest.fn().mockReturnValue(mockResponse),
			}),
		} as unknown as jest.Mocked<ExecutionContext>;

		callHandler = {
			handle: jest.fn(),
		};
	});

	describe("конструктор", () => {
		it("должен создать экземпляр обработчика", () => {
			expect(handler).toBeInstanceOf(HttpLoggingInterceptor);
		});
	});

	describe("intercept", () => {
		it("должен логировать входящий HTTP запрос и успешное выполнение", (done) => {
			callHandler.handle.mockReturnValue(of({ result: "success" }));

			const result = handler.intercept(executionContext, callHandler as never);

			result.subscribe({
				next: (value) => {
					expect(value).toEqual({ result: "success" });
					expect(loggerService.log).toHaveBeenCalledWith(
						expect.stringContaining("[HTTP] Incoming request [GET /api/test]")
					);
					expect(loggerService.log).toHaveBeenCalledWith(
						expect.stringContaining(`[HTTP] Request completed [GET /api/test] ${HttpStatus.OK}`)
					);
					done();
				},
			});
		});

		it("должен логировать ошибку при неудачном выполнении HTTP запроса и использовать статус код из ошибки", (done) => {
			const error = new HttpError("Test error", HttpStatus.BAD_REQUEST);
			// response.statusCode не должен использоваться
			mockResponse.statusCode = HttpStatus.OK;

			callHandler.handle.mockReturnValue(throwError(() => error));

			const result = handler.intercept(executionContext, callHandler as never);

			result.subscribe({
				error: (err) => {
					expect(err).toBe(error);
					expect(loggerService.log).toHaveBeenCalledWith(
						expect.stringContaining("[HTTP] Incoming request [GET /api/test]")
					);
					// Проверяем, что используется статус код из ошибки (BAD_REQUEST),
					// а не из response (OK)
					expect(loggerService.error).toHaveBeenCalledWith(
						expect.stringContaining(`[HTTP] Request failed [GET /api/test] ${HttpStatus.BAD_REQUEST}`)
					);
					done();
				},
			});
		});

		it("должен использовать значения по умолчанию, если данные отсутствуют", (done) => {
			mockRequest = {
				method: undefined,
				url: undefined,
				originalUrl: undefined,
				ip: undefined,
				socket: {
					remoteAddress: undefined,
				} as unknown as Request["socket"],
				get: jest.fn().mockReturnValue(undefined),
			};

			executionContext.switchToHttp = jest.fn().mockReturnValue({
				getRequest: jest.fn().mockReturnValue(mockRequest),
				getResponse: jest.fn().mockReturnValue({ statusCode: undefined }),
			});

			callHandler.handle.mockReturnValue(of({ result: "success" }));

			const result = handler.intercept(executionContext, callHandler as never);

			result.subscribe({
				next: () => {
					expect(loggerService.log).toHaveBeenCalledWith(
						expect.stringContaining("[HTTP] Incoming request")
					);
					expect(loggerService.log).toHaveBeenCalledWith(
						expect.stringContaining(`[HTTP] Request completed [UNKNOWN /unknown] ${HttpStatus.OK}`)
					);
					done();
				},
			});
		});

		it("должен обработать ошибку не типа Error и использовать статус код по умолчанию", (done) => {
			const error = "String error";
			// response.statusCode не должен использоваться
			mockResponse.statusCode = HttpStatus.OK;

			callHandler.handle.mockReturnValue(throwError(() => error));

			const result = handler.intercept(executionContext, callHandler as never);

			result.subscribe({
				error: () => {
					// Для строковой ошибки должен использоваться INTERNAL_SERVER_ERROR по умолчанию
					expect(loggerService.error).toHaveBeenCalledWith(
						expect.stringContaining(
							`[HTTP] Request failed [GET /api/test] ${HttpStatus.INTERNAL_SERVER_ERROR}`
						)
					);
					expect(loggerService.error).toHaveBeenCalledWith(expect.stringContaining("String error"));
					done();
				},
			});
		});

		it("должен использовать статус код из HttpException", (done) => {
			const error = new HttpException("Not Found", HttpStatus.NOT_FOUND);
			mockResponse.statusCode = HttpStatus.OK;

			callHandler.handle.mockReturnValue(throwError(() => error));

			const result = handler.intercept(executionContext, callHandler as never);

			result.subscribe({
				error: (err) => {
					expect(err).toBe(error);
					// Проверяем, что используется статус код из HttpException (NOT_FOUND)
					expect(loggerService.error).toHaveBeenCalledWith(
						expect.stringContaining(`[HTTP] Request failed [GET /api/test] ${HttpStatus.NOT_FOUND}`)
					);
					done();
				},
			});
		});
	});
});
