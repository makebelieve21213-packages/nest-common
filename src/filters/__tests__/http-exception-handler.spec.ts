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
	let mockRequest: { url: string };

	beforeEach(() => {
		mockLoggerService = {
			setContext: jest.fn(),
			error: jest.fn(),
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
	});
});
