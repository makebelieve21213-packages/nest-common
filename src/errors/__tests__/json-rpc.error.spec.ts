import { describe, it, expect } from "@jest/globals";
import { HttpException, HttpStatus } from "@nestjs/common";
import JsonRpcException from "src/errors/json-rpc.error";
import {
	JsonRpcErrorCode,
	JSON_RPC_ERROR_MESSAGES,
} from "src/types/json-rpc-error-codes";

describe("JsonRpcException", () => {
	describe("constructor", () => {
		it("должен создать исключение с кодом ошибки и сообщением по умолчанию", () => {
			const exception = new JsonRpcException(JsonRpcErrorCode.INTERNAL_ERROR);

			expect(exception).toBeInstanceOf(HttpException);
			expect(exception.getRpcErrorCode()).toBe(JsonRpcErrorCode.INTERNAL_ERROR);
			expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);

			const response = exception.getResponse();
			expect(response).toEqual({
				jsonrpc: "2.0",
				error: {
					code: JsonRpcErrorCode.INTERNAL_ERROR,
					message: JSON_RPC_ERROR_MESSAGES[JsonRpcErrorCode.INTERNAL_ERROR],
				},
			});
		});

		it("должен создать исключение с кастомным сообщением", () => {
			const customMessage = "Custom error message";
			const exception = new JsonRpcException(
				JsonRpcErrorCode.INVALID_REQUEST,
				customMessage,
			);

			expect(exception.getRpcErrorCode()).toBe(
				JsonRpcErrorCode.INVALID_REQUEST,
			);
			const response = exception.getResponse();
			expect(response).toEqual({
				jsonrpc: "2.0",
				error: {
					code: JsonRpcErrorCode.INVALID_REQUEST,
					message: customMessage,
				},
			});
		});

		it("должен создать исключение с данными", () => {
			const data = { requestId: "123", details: "Some details" };
			const exception = new JsonRpcException(
				JsonRpcErrorCode.INVALID_PARAMS,
				"Invalid params",
				data,
			);

			expect(exception.getRpcData()).toEqual(data);
			const response = exception.getResponse();
			expect(response).toEqual({
				jsonrpc: "2.0",
				error: {
					code: JsonRpcErrorCode.INVALID_PARAMS,
					message: "Invalid params",
					data,
				},
			});
		});

		it("должен создать исключение с кастомным HTTP статусом", () => {
			const exception = new JsonRpcException(
				JsonRpcErrorCode.INTERNAL_ERROR,
				"Error",
				undefined,
				HttpStatus.BAD_REQUEST,
			);

			expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
		});
	});

	describe("getRpcErrorCode", () => {
		it("должен вернуть код ошибки JSON-RPC", () => {
			const exception = new JsonRpcException(JsonRpcErrorCode.PARSE_ERROR);
			expect(exception.getRpcErrorCode()).toBe(JsonRpcErrorCode.PARSE_ERROR);
		});
	});

	describe("getRpcData", () => {
		it("должен вернуть данные ошибки", () => {
			const data = { key: "value" };
			const exception = new JsonRpcException(
				JsonRpcErrorCode.INTERNAL_ERROR,
				"Error",
				data,
			);
			expect(exception.getRpcData()).toEqual(data);
		});

		it("должен вернуть undefined если данные не были переданы", () => {
			const exception = new JsonRpcException(JsonRpcErrorCode.INTERNAL_ERROR);
			expect(exception.getRpcData()).toBeUndefined();
		});
	});

	describe("fromHttpException", () => {
		it("должен создать JsonRpcException из HttpException со строковым ответом", () => {
			const httpException = new HttpException("Error message", HttpStatus.BAD_REQUEST);
			const rpcException = JsonRpcException.fromHttpException(httpException, "123");

			expect(rpcException).toBeInstanceOf(JsonRpcException);
			expect(rpcException.getStatus()).toBe(HttpStatus.BAD_REQUEST);
			expect(rpcException.getRpcData()).toEqual({ requestId: "123" });
		});

		it("должен создать JsonRpcException из HttpException с объектным ответом", () => {
			const httpException = new HttpException(
				{ message: "Error message" },
				HttpStatus.NOT_FOUND,
			);
			const rpcException = JsonRpcException.fromHttpException(httpException, 456);

			expect(rpcException).toBeInstanceOf(JsonRpcException);
			expect(rpcException.getStatus()).toBe(HttpStatus.NOT_FOUND);
			expect(rpcException.getRpcData()).toEqual({ requestId: 456 });
		});

		it("должен использовать message из exception если response не содержит message", () => {
			const httpException = new HttpException(
				{ error: "Error" },
				HttpStatus.INTERNAL_SERVER_ERROR,
			);
			httpException.message = "Exception message";
			const rpcException = JsonRpcException.fromHttpException(httpException);

			const response = rpcException.getResponse();
			expect(
				typeof response === "object" &&
					response !== null &&
					"error" in response &&
					typeof response.error === "object" &&
					response.error !== null &&
					"message" in response.error
					? response.error.message
					: "",
			).toBe("Exception message");
		});
	});

	describe("fromError", () => {
		it("должен создать JsonRpcException из обычной Error", () => {
			const error = new Error("Something went wrong");
			const rpcException = JsonRpcException.fromError(error, "789");

			expect(rpcException).toBeInstanceOf(JsonRpcException);
			expect(rpcException.getRpcErrorCode()).toBe(JsonRpcErrorCode.INTERNAL_ERROR);
			expect(rpcException.getRpcData()).toEqual({
				requestId: "789",
				name: "Error",
			});
		});

		it("должен использовать null как requestId по умолчанию", () => {
			const error = new Error("Error");
			const rpcException = JsonRpcException.fromError(error);

			expect(rpcException.getRpcData()).toEqual({
				requestId: null,
				name: "Error",
			});
		});
	});

	describe("HTTP статусы для различных кодов ошибок", () => {
		it("должен вернуть BAD_REQUEST для PARSE_ERROR", () => {
			const exception = new JsonRpcException(JsonRpcErrorCode.PARSE_ERROR);
			expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
		});

		it("должен вернуть BAD_REQUEST для INVALID_REQUEST", () => {
			const exception = new JsonRpcException(JsonRpcErrorCode.INVALID_REQUEST);
			expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
		});

		it("должен вернуть BAD_REQUEST для INVALID_PARAMS", () => {
			const exception = new JsonRpcException(JsonRpcErrorCode.INVALID_PARAMS);
			expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
		});

		it("должен вернуть UNAUTHORIZED для UNAUTHORIZED", () => {
			const exception = new JsonRpcException(JsonRpcErrorCode.UNAUTHORIZED);
			expect(exception.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
		});

		it("должен вернуть FORBIDDEN для FORBIDDEN", () => {
			const exception = new JsonRpcException(JsonRpcErrorCode.FORBIDDEN);
			expect(exception.getStatus()).toBe(HttpStatus.FORBIDDEN);
		});

		it("должен вернуть NOT_FOUND для NOT_FOUND", () => {
			const exception = new JsonRpcException(JsonRpcErrorCode.NOT_FOUND);
			expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
		});

		it("должен вернуть NOT_FOUND для METHOD_NOT_FOUND", () => {
			const exception = new JsonRpcException(JsonRpcErrorCode.METHOD_NOT_FOUND);
			expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
		});

		it("должен вернуть TOO_MANY_REQUESTS для TOO_MANY_REQUESTS", () => {
			const exception = new JsonRpcException(JsonRpcErrorCode.TOO_MANY_REQUESTS);
			expect(exception.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
		});

		it("должен вернуть BAD_GATEWAY для BAD_GATEWAY", () => {
			const exception = new JsonRpcException(JsonRpcErrorCode.BAD_GATEWAY);
			expect(exception.getStatus()).toBe(HttpStatus.BAD_GATEWAY);
		});

		it("должен вернуть SERVICE_UNAVAILABLE для SERVICE_UNAVAILABLE", () => {
			const exception = new JsonRpcException(
				JsonRpcErrorCode.SERVICE_UNAVAILABLE,
			);
			expect(exception.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
		});

		it("должен вернуть GATEWAY_TIMEOUT для GATEWAY_TIMEOUT", () => {
			const exception = new JsonRpcException(JsonRpcErrorCode.GATEWAY_TIMEOUT);
			expect(exception.getStatus()).toBe(HttpStatus.GATEWAY_TIMEOUT);
		});

		it("должен вернуть INTERNAL_SERVER_ERROR для INTERNAL_ERROR", () => {
			const exception = new JsonRpcException(JsonRpcErrorCode.INTERNAL_ERROR);
			expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
		});

		it("должен вернуть INTERNAL_SERVER_ERROR для SERVER_ERROR", () => {
			const exception = new JsonRpcException(JsonRpcErrorCode.SERVER_ERROR);
			expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
		});
	});
});

