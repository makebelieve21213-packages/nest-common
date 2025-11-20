import { describe, it, expect } from "@jest/globals";
import { HttpStatus } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import RpcError from "src/errors/rpc.error";
import { RpcErrorType } from "src/types/rpc-types";

import type { AxiosError as AxiosErrorType } from "axios";

describe("RpcError", () => {
	describe("конструктор", () => {
		it("должен создать ошибку с сообщением", () => {
			const error = new RpcError("Test error message");

			expect(error).toBeInstanceOf(RpcError);
			expect(error).toBeInstanceOf(RpcException);
			expect(error.message).toBe("Test error message");
			expect(error.name).toBe("RpcError");
			expect(error.errorType).toBe(RpcErrorType.SERVICE_UNAVAILABLE);
			expect(error.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
		});

		it("должен создать ошибку со всеми параметрами", () => {
			const originalError = new Error("Original error");
			const error = new RpcError(
				"Test error",
				RpcErrorType.BAD_REQUEST,
				HttpStatus.BAD_REQUEST,
				originalError
			);

			expect(error.message).toBe("Test error");
			expect(error.errorType).toBe(RpcErrorType.BAD_REQUEST);
			expect(error.statusCode).toBe(HttpStatus.BAD_REQUEST);
		});
	});

	describe("isTransient", () => {
		it("должен вернуть true для временных ошибок", () => {
			const timeoutError = new RpcError("Timeout", RpcErrorType.RPC_TIMEOUT);
			expect(timeoutError.isTransient()).toBe(true);

			const unavailableError = new RpcError("Unavailable", RpcErrorType.SERVICE_UNAVAILABLE);
			expect(unavailableError.isTransient()).toBe(true);

			const rpcUnavailableError = new RpcError(
				"RPC Unavailable",
				RpcErrorType.RPC_SERVICE_UNAVAILABLE
			);
			expect(rpcUnavailableError.isTransient()).toBe(true);
		});

		it("должен вернуть false для постоянных ошибок", () => {
			const badRequestError = new RpcError("Bad Request", RpcErrorType.BAD_REQUEST);
			expect(badRequestError.isTransient()).toBe(false);

			const unauthorizedError = new RpcError("Unauthorized", RpcErrorType.UNAUTHORIZED);
			expect(unauthorizedError.isTransient()).toBe(false);

			const forbiddenError = new RpcError("Forbidden", RpcErrorType.FORBIDDEN);
			expect(forbiddenError.isTransient()).toBe(false);

			const notFoundError = new RpcError("Not Found", RpcErrorType.NOT_FOUND);
			expect(notFoundError.isTransient()).toBe(false);

			const validationError = new RpcError("Validation Error", RpcErrorType.VALIDATION_ERROR);
			expect(validationError.isTransient()).toBe(false);
		});
	});

	describe("fromUnknown", () => {
		it("должен создать RpcError из Error", () => {
			const originalError = new Error("Original error message");
			const error = RpcError.fromUnknown(originalError);

			expect(error).toBeInstanceOf(RpcError);
			expect(error).toBeInstanceOf(RpcException);
			expect(error.message).toBe("Original error message");
		});

		it("должен создать RpcError из строки", () => {
			const error = RpcError.fromUnknown("String error");

			expect(error).toBeInstanceOf(RpcError);
			expect(error.message).toBe("String error");
		});

		it("должен создать RpcError из числа", () => {
			const error = RpcError.fromUnknown(123);

			expect(error).toBeInstanceOf(RpcError);
			expect(error.message).toBe("123");
		});

		it("должен вернуть тот же RpcError если передан RpcError", () => {
			const originalError = new RpcError("Original RpcError");
			const error = RpcError.fromUnknown(originalError);

			expect(error).toBe(originalError);
		});

		it("должен создать RpcError из объекта с message", () => {
			const errorObject = { message: "Server error" };
			const error = RpcError.fromUnknown(errorObject);

			expect(error).toBeInstanceOf(RpcError);
			expect(error.message).toBe("Server error");
		});

		it("должен создать RpcError из null", () => {
			const error = RpcError.fromUnknown(null);

			expect(error).toBeInstanceOf(RpcError);
			expect(error.message).toBe("null");
		});

		it("должен создать RpcError из undefined", () => {
			const error = RpcError.fromUnknown(undefined);

			expect(error).toBeInstanceOf(RpcError);
			expect(error.message).toBe("undefined");
		});

		it("должен определить тип ошибки по сообщению - timeout", () => {
			const error = RpcError.fromUnknown("Request timeout");
			expect(error.errorType).toBe(RpcErrorType.RPC_TIMEOUT);
			expect(error.isTransient()).toBe(true);
		});

		it("должен определить тип ошибки по сообщению - bad request", () => {
			const error = RpcError.fromUnknown("Bad request invalid data");
			expect(error.errorType).toBe(RpcErrorType.BAD_REQUEST);
			expect(error.isTransient()).toBe(false);
		});

		it("должен определить тип ошибки по сообщению - not found", () => {
			const error = RpcError.fromUnknown("Resource not found");
			expect(error.errorType).toBe(RpcErrorType.NOT_FOUND);
			expect(error.isTransient()).toBe(false);
		});

		it("должен определить тип ошибки по сообщению - validation", () => {
			const error = RpcError.fromUnknown("Validation error");
			expect(error.errorType).toBe(RpcErrorType.VALIDATION_ERROR);
			expect(error.isTransient()).toBe(false);
		});

		it("должен определить тип ошибки по сообщению - service unavailable", () => {
			const error = RpcError.fromUnknown("Service unavailable");
			expect(error.errorType).toBe(RpcErrorType.SERVICE_UNAVAILABLE);
			expect(error.isTransient()).toBe(true);
		});

		it("должен определить тип ошибки по сообщению - rpc service unavailable", () => {
			const error = RpcError.fromUnknown("RPC service unavailable");
			expect(error.errorType).toBe(RpcErrorType.RPC_SERVICE_UNAVAILABLE);
			expect(error.isTransient()).toBe(true);
		});

		it("должен определить тип ошибки по сообщению - unauthorized", () => {
			const error = RpcError.fromUnknown("Unauthorized access");
			expect(error.errorType).toBe(RpcErrorType.UNAUTHORIZED);
			expect(error.isTransient()).toBe(false);
		});

		it("должен определить тип ошибки по сообщению - authentication", () => {
			const error = RpcError.fromUnknown("Authentication failed");
			expect(error.errorType).toBe(RpcErrorType.UNAUTHORIZED);
			expect(error.isTransient()).toBe(false);
		});

		it("должен определить тип ошибки по сообщению - auth", () => {
			const error = RpcError.fromUnknown("Auth error");
			expect(error.errorType).toBe(RpcErrorType.UNAUTHORIZED);
			expect(error.isTransient()).toBe(false);
		});

		it("должен определить тип ошибки по сообщению - forbidden", () => {
			const error = RpcError.fromUnknown("Forbidden action");
			expect(error.errorType).toBe(RpcErrorType.FORBIDDEN);
			expect(error.isTransient()).toBe(false);
		});

		it("должен определить тип ошибки по сообщению - access denied", () => {
			const error = RpcError.fromUnknown("Access denied");
			expect(error.errorType).toBe(RpcErrorType.FORBIDDEN);
			expect(error.isTransient()).toBe(false);
		});

		it("должен определить тип ошибки по сообщению - permission", () => {
			const error = RpcError.fromUnknown("Permission denied");
			expect(error.errorType).toBe(RpcErrorType.FORBIDDEN);
			expect(error.isTransient()).toBe(false);
		});

		it("должен определить тип ошибки по сообщению - rpc validation", () => {
			const error = RpcError.fromUnknown("RPC validation error");
			expect(error.errorType).toBe(RpcErrorType.RPC_VALIDATION_ERROR);
			expect(error.isTransient()).toBe(false);
		});

		it("должен определить тип ошибки по сообщению - timed out", () => {
			const error = RpcError.fromUnknown("Request timed out");
			expect(error.errorType).toBe(RpcErrorType.RPC_TIMEOUT);
			expect(error.isTransient()).toBe(true);
		});

		it("должен определить тип ошибки по сообщению - rpc_timeout", () => {
			const error = RpcError.fromUnknown("RPC timeout occurred");
			expect(error.errorType).toBe(RpcErrorType.RPC_TIMEOUT);
			expect(error.isTransient()).toBe(true);
		});

		it("должен определить тип ошибки по сообщению - unavailable", () => {
			const error = RpcError.fromUnknown("Service is unavailable");
			expect(error.errorType).toBe(RpcErrorType.SERVICE_UNAVAILABLE);
			expect(error.isTransient()).toBe(true);
		});

		it("должен определить тип ошибки по сообщению - service_unavailable", () => {
			const error = RpcError.fromUnknown("Service_unavailable");
			expect(error.errorType).toBe(RpcErrorType.SERVICE_UNAVAILABLE);
			expect(error.isTransient()).toBe(true);
		});

		it("должен определить тип ошибки по сообщению - rpc service unavailable", () => {
			const error = RpcError.fromUnknown("RPC service unavailable");
			expect(error.errorType).toBe(RpcErrorType.RPC_SERVICE_UNAVAILABLE);
			expect(error.isTransient()).toBe(true);
		});

		it("должен определить тип ошибки по сообщению - rpc_service_unavailable", () => {
			const error = RpcError.fromUnknown("RPC_service_unavailable");
			expect(error.errorType).toBe(RpcErrorType.RPC_SERVICE_UNAVAILABLE);
			expect(error.isTransient()).toBe(true);
		});

		it("должен определить тип ошибки по сообщению - invalid", () => {
			const error = RpcError.fromUnknown("Invalid request data");
			expect(error.errorType).toBe(RpcErrorType.BAD_REQUEST);
			expect(error.isTransient()).toBe(false);
		});

		it("должен определить тип ошибки по сообщению - bad_request", () => {
			const error = RpcError.fromUnknown("Bad_request error");
			expect(error.errorType).toBe(RpcErrorType.BAD_REQUEST);
			expect(error.isTransient()).toBe(false);
		});

		it("должен определить тип ошибки по сообщению - not_found", () => {
			const error = RpcError.fromUnknown("Resource not_found");
			expect(error.errorType).toBe(RpcErrorType.NOT_FOUND);
			expect(error.isTransient()).toBe(false);
		});

		it("должен определить тип ошибки по сообщению - 404", () => {
			const error = RpcError.fromUnknown("Error 404 occurred");
			expect(error.errorType).toBe(RpcErrorType.NOT_FOUND);
			expect(error.isTransient()).toBe(false);
		});

		it("должен создать RpcError из RpcException с объектным errorData без message", () => {
			const rpcException = new RpcException({ code: 123 });
			// Мокаем getError чтобы вернуть объект без message
			const originalGetError = rpcException.getError.bind(rpcException);
			jest.spyOn(rpcException, "getError").mockReturnValue({
				code: 123,
			} as unknown as string | object);

			const error = RpcError.fromUnknown(rpcException);

			expect(error).toBeInstanceOf(RpcError);
			expect(error.message).toBe("[object Object]");

			rpcException.getError = originalGetError;
		});

		it("должен создать RpcError из RpcException с Error в errorData", () => {
			const innerError = new Error("Inner error message");
			const rpcException = new RpcException(innerError);
			const error = RpcError.fromUnknown(rpcException);

			expect(error).toBeInstanceOf(RpcError);
			expect(error.message).toBe("Inner error message");
		});

		it("должен создать RpcError из RpcException с нестандартным errorData", () => {
			const rpcException = new RpcException(String(123));
			const error = RpcError.fromUnknown(rpcException);

			expect(error).toBeInstanceOf(RpcError);
			expect(error.message).toBe("123");
		});

		it("должен создать RpcError из объекта с полем error (сериализованный RpcException)", () => {
			const errorObject = {
				error: "RPC error message",
			};
			const error = RpcError.fromUnknown(errorObject);

			expect(error).toBeInstanceOf(RpcError);
			expect(error.message).toBe("RPC error message");
		});

		it("должен создать RpcError из объекта с полем error содержащим Error", () => {
			const innerError = new Error("Inner error");
			const errorObject = {
				error: innerError,
			};
			const error = RpcError.fromUnknown(errorObject);

			expect(error).toBeInstanceOf(RpcError);
			expect(error.message).toBe("Inner error");
		});

		it("должен создать RpcError из объекта с полем error содержащим объект с message", () => {
			const errorObject = {
				error: {
					message: "Nested error message",
				},
			};
			const error = RpcError.fromUnknown(errorObject);

			expect(error).toBeInstanceOf(RpcError);
			expect(error.message).toBe("Nested error message");
		});

		it("должен создать RpcError из объекта с полем error содержащим нестандартное значение", () => {
			const errorObject = {
				error: 456,
			};
			const error = RpcError.fromUnknown(errorObject);

			expect(error).toBeInstanceOf(RpcError);
			expect(error.message).toBe("456");
		});

		it("должен установить правильный статус-код для UNAUTHORIZED", () => {
			const error = RpcError.fromUnknown("Unauthorized access");
			expect(error.statusCode).toBe(HttpStatus.UNAUTHORIZED);
		});

		it("должен установить правильный статус-код для FORBIDDEN", () => {
			const error = RpcError.fromUnknown("Forbidden action");
			expect(error.statusCode).toBe(HttpStatus.FORBIDDEN);
		});

		it("должен создать RpcError из RpcException с errorData не строкой, не Error и не объектом с message (fallback на String(errorData))", () => {
			const rpcException = {
				getError: jest.fn().mockReturnValue({ code: 123 }),
				message: "",
			} as unknown as RpcException;
			Object.setPrototypeOf(rpcException, RpcException.prototype);

			const error = RpcError.fromUnknown(rpcException);

			expect(error).toBeInstanceOf(RpcError);
			expect(error.message).toBe("[object Object]");
		});

		it("должен создать RpcError из RpcException с errorData числом (fallback на String)", () => {
			const rpcException = {
				getError: jest.fn().mockReturnValue(123),
				message: "",
			} as unknown as RpcException;
			Object.setPrototypeOf(rpcException, RpcException.prototype);

			const error = RpcError.fromUnknown(rpcException);

			expect(error).toBeInstanceOf(RpcError);
			expect(error.message).toBe("123");
		});

		it("должен создать RpcError из AxiosError", () => {
			const axiosError = {
				isAxiosError: true,
				message: "Too many requests",
				response: { status: 429 },
			} as unknown as AxiosErrorType;

			const error = RpcError.fromUnknown(axiosError);

			expect(error).toBeInstanceOf(RpcError);
			expect(error.message).toBe("Too many requests");
		});
	});

	describe("getError", () => {
		it("должен вернуть объект с message, errorType и statusCode", () => {
			const error = new RpcError("Test error", RpcErrorType.BAD_REQUEST, HttpStatus.BAD_REQUEST);

			const errorData = error.getError();

			expect(errorData).toEqual({
				message: "Test error",
				errorType: RpcErrorType.BAD_REQUEST,
				statusCode: HttpStatus.BAD_REQUEST,
			});
		});

		it("должен вернуть правильные значения по умолчанию", () => {
			const error = new RpcError("Test error");

			const errorData = error.getError();

			expect(errorData).toEqual({
				message: "Test error",
				errorType: RpcErrorType.SERVICE_UNAVAILABLE,
				statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
			});
		});
	});

	describe("instanceof", () => {
		it("должен правильно работать с instanceof RpcException", () => {
			const error = new RpcError("Test");

			expect(error instanceof RpcException).toBe(true);
		});

		it("должен правильно работать с instanceof RpcError", () => {
			const error = new RpcError("Test");

			expect(error instanceof RpcError).toBe(true);
		});

		it("должен правильно работать с instanceof для ошибок созданных через fromUnknown", () => {
			const error = RpcError.fromUnknown(new Error("Test"));

			expect(error instanceof RpcException).toBe(true);
			expect(error instanceof RpcError).toBe(true);
		});
	});
});
