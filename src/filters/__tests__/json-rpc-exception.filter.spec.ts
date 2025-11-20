import { describe, it, expect, beforeEach } from "@jest/globals";
import { HttpStatus } from "@nestjs/common";
import JsonRpcException from "src/errors/json-rpc.error";
import JsonRpcExceptionFilter from "src/filters/json-rpc-exception.filter";
import {
	JsonRpcErrorCode,
	JSON_RPC_ERROR_MESSAGES,
	JSON_RPC_ERROR_NAMES,
} from "src/types/json-rpc-error-codes";

import type { LoggerService } from "@makebelieve21213-packages/logger";
import type { ArgumentsHost } from "@nestjs/common";
import type { Request, Response } from "express";

describe("JsonRpcExceptionFilter", () => {
	let filter: JsonRpcExceptionFilter;
	let mockLogger: jest.Mocked<LoggerService>;
	let mockResponse: jest.Mocked<Response>;
	let mockRequest: jest.Mocked<Request>;
	let mockArgumentsHost: jest.Mocked<ArgumentsHost>;

	beforeEach(() => {
		mockLogger = {
			setContext: jest.fn(),
			error: jest.fn(),
		} as unknown as jest.Mocked<LoggerService>;

		mockResponse = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn().mockReturnThis(),
		} as unknown as jest.Mocked<Response>;

		mockRequest = {
			body: {},
		} as unknown as jest.Mocked<Request>;

		mockArgumentsHost = {
			switchToHttp: jest.fn().mockReturnValue({
				getResponse: jest.fn().mockReturnValue(mockResponse),
				getRequest: jest.fn().mockReturnValue(mockRequest),
			}),
		} as unknown as jest.Mocked<ArgumentsHost>;

		filter = new JsonRpcExceptionFilter(mockLogger);
	});

	describe("catch - JsonRpcException", () => {
		it("должен обработать JsonRpcException и вернуть правильный JSON-RPC ответ", () => {
			const requestId = 123;
			mockRequest.body = { id: requestId };
			const exception = new JsonRpcException(
				JsonRpcErrorCode.INVALID_REQUEST,
				"Invalid request",
				{ details: "test" }
			);

			filter.catch(exception, mockArgumentsHost);

			expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
			expect(mockResponse.json).toHaveBeenCalledWith({
				jsonrpc: "2.0",
				id: requestId,
				error: {
					code: JsonRpcErrorCode.INVALID_REQUEST,
					message: "Invalid request",
					data: { details: "test" },
				},
			});
			expect(mockLogger.error).toHaveBeenCalled();
		});

		it("должен обработать JsonRpcException без данных", () => {
			const requestId = "abc";
			mockRequest.body = { id: requestId };
			const exception = new JsonRpcException(JsonRpcErrorCode.PARSE_ERROR);

			filter.catch(exception, mockArgumentsHost);

			expect(mockResponse.json).toHaveBeenCalledWith({
				jsonrpc: "2.0",
				id: requestId,
				error: {
					code: JsonRpcErrorCode.PARSE_ERROR,
					message: JSON_RPC_ERROR_MESSAGES[JsonRpcErrorCode.PARSE_ERROR],
				},
			});
		});

		it("должен использовать null как requestId если id отсутствует в body", () => {
			mockRequest.body = {};
			const exception = new JsonRpcException(JsonRpcErrorCode.INTERNAL_ERROR);

			filter.catch(exception, mockArgumentsHost);

			expect(mockResponse.json).toHaveBeenCalledWith({
				jsonrpc: "2.0",
				id: null,
				error: {
					code: JsonRpcErrorCode.INTERNAL_ERROR,
					message: JSON_RPC_ERROR_MESSAGES[JsonRpcErrorCode.INTERNAL_ERROR],
				},
			});
		});

		it("должен извлечь сообщение из response.error.message", () => {
			const exception = new JsonRpcException(
				JsonRpcErrorCode.METHOD_NOT_FOUND,
				"Method not found"
			);

			filter.catch(exception, mockArgumentsHost);

			expect(mockResponse.json).toHaveBeenCalledWith(
				expect.objectContaining({
					error: expect.objectContaining({
						message: "Method not found",
					}),
				})
			);
		});
	});

	describe("catch - Error", () => {
		it("должен обработать обычную Error и преобразовать в JSON-RPC формат", () => {
			const requestId = 456;
			mockRequest.body = { id: requestId };
			const error = new Error("Something went wrong");

			filter.catch(error, mockArgumentsHost);

			expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
			expect(mockResponse.json).toHaveBeenCalledWith({
				jsonrpc: "2.0",
				id: requestId,
				error: {
					code: JsonRpcErrorCode.INTERNAL_ERROR,
					message: "Something went wrong",
					data: {
						name: JSON_RPC_ERROR_NAMES[JsonRpcErrorCode.INTERNAL_ERROR],
						originalError: "Error",
					},
				},
			});
			expect(mockLogger.error).toHaveBeenCalledWith(
				expect.stringContaining("Something went wrong"),
				error.stack
			);
		});

		it("должен использовать сообщение по умолчанию если у Error нет message", () => {
			const error = new Error();
			error.message = "";

			filter.catch(error, mockArgumentsHost);

			expect(mockResponse.json).toHaveBeenCalledWith(
				expect.objectContaining({
					error: expect.objectContaining({
						message: JSON_RPC_ERROR_MESSAGES[JsonRpcErrorCode.INTERNAL_ERROR],
					}),
				})
			);
		});

		it("должен обработать Error с полем status", () => {
			const error = new Error("Bad request");
			(error as unknown as { status: number }).status = HttpStatus.BAD_REQUEST;

			filter.catch(error, mockArgumentsHost);

			expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
			expect(mockResponse.json).toHaveBeenCalledWith(
				expect.objectContaining({
					error: expect.objectContaining({
						code: JsonRpcErrorCode.INTERNAL_ERROR,
					}),
				})
			);
		});

		it("должен обработать Error с полем statusCode", () => {
			const error = new Error("Not found");
			(error as unknown as { statusCode: number }).statusCode = HttpStatus.NOT_FOUND;

			filter.catch(error, mockArgumentsHost);

			expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
		});
	});

	describe("catch - Unknown", () => {
		it("должен обработать неизвестный тип исключения", () => {
			const unknownException = "String error";

			filter.catch(unknownException, mockArgumentsHost);

			expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
			expect(mockResponse.json).toHaveBeenCalledWith({
				jsonrpc: "2.0",
				id: null,
				error: {
					code: JsonRpcErrorCode.INTERNAL_ERROR,
					message: JSON_RPC_ERROR_MESSAGES[JsonRpcErrorCode.INTERNAL_ERROR],
					data: {
						name: JSON_RPC_ERROR_NAMES[JsonRpcErrorCode.INTERNAL_ERROR],
					},
				},
			});
			expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining("String error"));
		});

		it("должен обработать null как неизвестное исключение", () => {
			filter.catch(null, mockArgumentsHost);

			expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
			expect(mockResponse.json).toHaveBeenCalledWith(
				expect.objectContaining({
					error: expect.objectContaining({
						code: JsonRpcErrorCode.INTERNAL_ERROR,
					}),
				})
			);
		});

		it("должен обработать undefined как неизвестное исключение", () => {
			filter.catch(undefined, mockArgumentsHost);

			expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
		});
	});

	describe("requestId extraction", () => {
		it("должен извлечь requestId как число", () => {
			mockRequest.body = { id: 789 };
			const exception = new JsonRpcException(JsonRpcErrorCode.INTERNAL_ERROR);

			filter.catch(exception, mockArgumentsHost);

			expect(mockResponse.json).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 789,
				})
			);
		});

		it("должен извлечь requestId как строку", () => {
			mockRequest.body = { id: "request-123" };
			const exception = new JsonRpcException(JsonRpcErrorCode.INTERNAL_ERROR);

			filter.catch(exception, mockArgumentsHost);

			expect(mockResponse.json).toHaveBeenCalledWith(
				expect.objectContaining({
					id: "request-123",
				})
			);
		});

		it("должен использовать null если id равен null", () => {
			mockRequest.body = { id: null };
			const exception = new JsonRpcException(JsonRpcErrorCode.INTERNAL_ERROR);

			filter.catch(exception, mockArgumentsHost);

			expect(mockResponse.json).toHaveBeenCalledWith(
				expect.objectContaining({
					id: null,
				})
			);
		});

		it("должен использовать null если id отсутствует", () => {
			mockRequest.body = {};
			const exception = new JsonRpcException(JsonRpcErrorCode.INTERNAL_ERROR);

			filter.catch(exception, mockArgumentsHost);

			expect(mockResponse.json).toHaveBeenCalledWith(
				expect.objectContaining({
					id: null,
				})
			);
		});
	});

	describe("logger context", () => {
		it("должен установить контекст логгера при создании", () => {
			expect(mockLogger.setContext).toHaveBeenCalledWith(JsonRpcExceptionFilter.name);
		});
	});
});
