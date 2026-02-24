import { HttpException, HttpStatus } from "@nestjs/common";
import HttpExceptionFilter from "src/filters/http-exception-handler";
import { ContextType } from "src/types/context-types";

import type { LoggerService } from "@makebelieve21213-packages/logger";
import type { ArgumentsHost } from "@nestjs/common";

describe("HttpExceptionFilter", () => {
	let handler: HttpExceptionFilter;
	let mockLoggerService: jest.Mocked<LoggerService>;
	let mockArgumentsHost: jest.Mocked<ArgumentsHost>;
	let mockResponse: {
		status: jest.Mock;
		json: jest.Mock;
	};
	let mockRequest: { url?: string; path?: string };

	beforeEach(() => {
		mockLoggerService = {
			setContext: jest.fn(),
			error: jest.fn(),
			warn: jest.fn(),
		} as unknown as jest.Mocked<LoggerService>;

		mockResponse = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		mockRequest = { url: "/test" };

		mockArgumentsHost = {
			getType: jest.fn().mockReturnValue(ContextType.HTTP),
			switchToHttp: jest.fn().mockReturnValue({
				getResponse: jest.fn().mockReturnValue(mockResponse),
				getRequest: jest.fn().mockReturnValue(mockRequest),
			}),
		} as unknown as jest.Mocked<ArgumentsHost>;

		handler = new HttpExceptionFilter(mockLoggerService);
	});

	describe("конструктор", () => {
		it("должен установить контекст логгера", () => {
			const exception = new HttpException("Test error", HttpStatus.BAD_REQUEST);
			handler.handleException(exception, mockArgumentsHost);

			expect(mockLoggerService.setContext).toHaveBeenCalledWith("HttpExceptionFilter");
		});
	});

	describe("handleException", () => {
		it("должен обработать стандартный HttpException со строковым response", () => {
			const exception = new HttpException("Test error", HttpStatus.BAD_REQUEST);

			handler.handleException(exception, mockArgumentsHost);

			expect(mockLoggerService.error).toHaveBeenCalledWith(expect.stringContaining("HTTP 400"));
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith(
				expect.objectContaining({
					statusCode: 400,
					error: "HttpError",
					message: "Test error",
					path: "/test",
				})
			);
		});

		it("должен обработать обычный Error как InternalServerError", () => {
			const exception = new Error("Unexpected error");

			handler.handleException(exception, mockArgumentsHost);

			expect(mockResponse.status).toHaveBeenCalledWith(500);
			expect(mockResponse.json).toHaveBeenCalledWith(
				expect.objectContaining({
					statusCode: 500,
					error: "HttpError",
					message: "Unexpected error",
				})
			);
		});

		it("должен включить timestamp в response", () => {
			const exception = new HttpException("Test", HttpStatus.BAD_REQUEST);
			const beforeTime = new Date().toISOString();

			handler.handleException(exception, mockArgumentsHost);

			const response = (mockResponse.json as jest.Mock).mock.calls[0][0] as {
				timestamp: string;
			};
			const afterTime = new Date().toISOString();

			expect(response.timestamp).toBeDefined();
			expect(response.timestamp >= beforeTime).toBe(true);
			expect(response.timestamp <= afterTime).toBe(true);
		});

		it("должен добавить stack trace если он есть в exception", () => {
			const exception = new Error("Test error");
			exception.stack = "Stack trace here";

			handler.handleException(exception, mockArgumentsHost);

			expect(mockResponse.json).toHaveBeenCalledWith(
				expect.objectContaining({
					stack: "Stack trace here",
				})
			);
		});

		it("не должен добавлять stack trace если exception не Error", () => {
			const exception = "String error";

			handler.handleException(exception, mockArgumentsHost);

			expect(mockResponse.json).toHaveBeenCalled();
			const response = (mockResponse.json as jest.Mock).mock.calls[0][0] as {
				stack?: string;
			};

			expect(response.stack).toBeUndefined();
		});

		it("должен включить code в response когда extractRpcCode возвращает код", () => {
			const exception = {
				data: { code: "UNAUTHORIZED", message: "Auth failed" },
			};

			handler.handleException(exception, mockArgumentsHost);

			expect(mockResponse.json).toHaveBeenCalledWith(
				expect.objectContaining({
					code: "UNAUTHORIZED",
				})
			);
		});

		it("должен логировать warn вместо error для 401 Unauthorized", () => {
			const exception = new HttpException("Unauthorized", HttpStatus.UNAUTHORIZED);

			handler.handleException(exception, mockArgumentsHost);

			expect(mockLoggerService.warn).toHaveBeenCalledWith(expect.stringContaining("HTTP 401"));
			expect(mockLoggerService.error).not.toHaveBeenCalled();
		});

		it("должен использовать rpcCodeToHttpStatus маппер когда он возвращает не 500", () => {
			const rpcCodeToHttpStatus = jest.fn((code: string | undefined) =>
				code === "NOT_FOUND" ? HttpStatus.NOT_FOUND : undefined
			);
			handler = new HttpExceptionFilter(mockLoggerService, rpcCodeToHttpStatus);
			const exception = {
				data: { code: "NOT_FOUND", message: "Resource not found" },
			};

			handler.handleException(exception, mockArgumentsHost);

			expect(mockResponse.status).toHaveBeenCalledWith(404);
			expect(rpcCodeToHttpStatus).toHaveBeenCalledWith("NOT_FOUND");
		});

		it("должен использовать httpError.getStatus когда rpcCodeToHttpStatus возвращает 500", () => {
			const rpcCodeToHttpStatus = jest.fn(() => HttpStatus.INTERNAL_SERVER_ERROR);
			handler = new HttpExceptionFilter(mockLoggerService, rpcCodeToHttpStatus);
			const exception = new HttpException("Bad request", HttpStatus.BAD_REQUEST);

			handler.handleException(exception, mockArgumentsHost);

			expect(mockResponse.status).toHaveBeenCalledWith(400);
		});

		it("должен использовать stringifyForLog для Error с message '[object Object]' и getResponse", () => {
			const err = new Error("[object Object]") as Error & { getResponse?: () => unknown };
			err.getResponse = () => ({ statusCode: 400, message: "Bad" });

			handler.handleException(err, mockArgumentsHost);

			expect(mockLoggerService.error).toHaveBeenCalledWith(
				expect.stringContaining('"statusCode":400')
			);
		});

		it("должен использовать request.path когда request.url отсутствует", () => {
			mockRequest = { path: "/fallback-path" };
			mockArgumentsHost = {
				getType: jest.fn().mockReturnValue(ContextType.HTTP),
				switchToHttp: jest.fn().mockReturnValue({
					getResponse: jest.fn().mockReturnValue(mockResponse),
					getRequest: jest.fn().mockReturnValue(mockRequest),
				}),
			} as unknown as jest.Mocked<ArgumentsHost>;

			const exception = new HttpException("Test", HttpStatus.BAD_REQUEST);
			handler.handleException(exception, mockArgumentsHost);

			expect(mockLoggerService.error).toHaveBeenCalledWith(
				expect.stringContaining("path: /fallback-path")
			);
		});

		it("должен использовать path 'unknown' когда request.url и request.path отсутствуют", () => {
			mockRequest = {};
			mockArgumentsHost = {
				getType: jest.fn().mockReturnValue(ContextType.HTTP),
				switchToHttp: jest.fn().mockReturnValue({
					getResponse: jest.fn().mockReturnValue(mockResponse),
					getRequest: jest.fn().mockReturnValue(mockRequest),
				}),
			} as unknown as jest.Mocked<ArgumentsHost>;

			const exception = new HttpException("Test", HttpStatus.BAD_REQUEST);
			handler.handleException(exception, mockArgumentsHost);

			expect(mockLoggerService.error).toHaveBeenCalledWith(expect.stringContaining("path: unknown"));
		});

		it("должен использовать stringifyForLog для Error с message не строкой", () => {
			const err = new Error("normal");
			Object.defineProperty(err, "message", { value: { nested: "obj" }, configurable: true });

			handler.handleException(err, mockArgumentsHost);

			expect(mockLoggerService.error).toHaveBeenCalledWith(expect.stringContaining('"nested":"obj"'));
		});
	});
});
