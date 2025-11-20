import { describe, it, expect, beforeEach } from "@jest/globals";
import JsonRpcException from "src/errors/json-rpc.error";
import JsonRpcValidationPipe from "src/pipes/json-rpc-validation.pipe";
import { JsonRpcErrorCode } from "src/types/json-rpc-error-codes";

describe("JsonRpcValidationPipe", () => {
	let pipe: JsonRpcValidationPipe;

	beforeEach(() => {
		pipe = new JsonRpcValidationPipe();
	});

	describe("валидные запросы", () => {
		it("должен принять валидный JSON-RPC запрос с id, method и params", () => {
			const request = {
				jsonrpc: "2.0",
				id: 1,
				method: "test.method",
				params: { key: "value" },
			};

			const result = pipe.transform(request);

			expect(result).toEqual({
				jsonrpc: "2.0",
				id: 1,
				method: "test.method",
				params: { key: "value" },
			});
		});

		it("должен принять валидный JSON-RPC запрос без params", () => {
			const request = {
				jsonrpc: "2.0",
				id: "123",
				method: "test.method",
			};

			const result = pipe.transform(request);

			expect(result).toEqual({
				jsonrpc: "2.0",
				id: "123",
				method: "test.method",
			});
		});

		it("должен принять валидный JSON-RPC запрос с null id", () => {
			const request = {
				jsonrpc: "2.0",
				id: null,
				method: "test.method",
			};

			const result = pipe.transform(request);

			expect(result).toEqual({
				jsonrpc: "2.0",
				id: null,
				method: "test.method",
			});
		});

		it("должен принять валидный JSON-RPC запрос без id", () => {
			const request = {
				jsonrpc: "2.0",
				method: "test.method",
			};

			const result = pipe.transform(request);

			expect(result).toEqual({
				jsonrpc: "2.0",
				id: undefined,
				method: "test.method",
			});
		});

		it("должен принять валидный JSON-RPC запрос с числовым id", () => {
			const request = {
				jsonrpc: "2.0",
				id: 42,
				method: "test.method",
			};

			const result = pipe.transform(request);

			expect(result.id).toBe(42);
		});

		it("должен принять валидный JSON-RPC запрос со строковым id", () => {
			const request = {
				jsonrpc: "2.0",
				id: "request-id",
				method: "test.method",
			};

			const result = pipe.transform(request);

			expect(result.id).toBe("request-id");
		});
	});

	describe("невалидные запросы", () => {
		it("должен выбросить JsonRpcException для null", () => {
			expect(() => pipe.transform(null)).toThrow(JsonRpcException);
			try {
				pipe.transform(null);
			} catch (error) {
				expect(error).toBeInstanceOf(JsonRpcException);
				expect((error as JsonRpcException).getRpcErrorCode()).toBe(JsonRpcErrorCode.PARSE_ERROR);
			}
		});

		it("должен выбросить JsonRpcException для undefined", () => {
			expect(() => pipe.transform(undefined)).toThrow(JsonRpcException);
			try {
				pipe.transform(undefined);
			} catch (error) {
				expect(error).toBeInstanceOf(JsonRpcException);
				expect((error as JsonRpcException).getRpcErrorCode()).toBe(JsonRpcErrorCode.PARSE_ERROR);
			}
		});

		it("должен выбросить JsonRpcException для строки", () => {
			expect(() => pipe.transform("string")).toThrow(JsonRpcException);
			try {
				pipe.transform("string");
			} catch (error) {
				expect(error).toBeInstanceOf(JsonRpcException);
				expect((error as JsonRpcException).getRpcErrorCode()).toBe(JsonRpcErrorCode.PARSE_ERROR);
			}
		});

		it("должен выбросить JsonRpcException для числа", () => {
			expect(() => pipe.transform(123)).toThrow(JsonRpcException);
		});

		it("должен выбросить JsonRpcException для неверной версии jsonrpc", () => {
			const request = {
				jsonrpc: "1.0",
				id: 1,
				method: "test.method",
			};

			expect(() => pipe.transform(request)).toThrow(JsonRpcException);
			try {
				pipe.transform(request);
			} catch (error) {
				expect(error).toBeInstanceOf(JsonRpcException);
				expect((error as JsonRpcException).getRpcErrorCode()).toBe(
					JsonRpcErrorCode.INVALID_REQUEST
				);
				const rpcData = (error as JsonRpcException).getRpcData();
				expect(rpcData).toEqual({ requestId: 1 });
			}
		});

		it("должен выбросить JsonRpcException для отсутствующего method", () => {
			const request = {
				jsonrpc: "2.0",
				id: 1,
			};

			expect(() => pipe.transform(request)).toThrow(JsonRpcException);
			try {
				pipe.transform(request);
			} catch (error) {
				expect(error).toBeInstanceOf(JsonRpcException);
				expect((error as JsonRpcException).getRpcErrorCode()).toBe(
					JsonRpcErrorCode.INVALID_REQUEST
				);
			}
		});

		it("должен выбросить JsonRpcException для method не строки", () => {
			const request = {
				jsonrpc: "2.0",
				id: 1,
				method: 123,
			};

			expect(() => pipe.transform(request)).toThrow(JsonRpcException);
			try {
				pipe.transform(request);
			} catch (error) {
				expect(error).toBeInstanceOf(JsonRpcException);
				expect((error as JsonRpcException).getRpcErrorCode()).toBe(
					JsonRpcErrorCode.INVALID_REQUEST
				);
			}
		});

		it("должен выбросить JsonRpcException для невалидного типа id", () => {
			const request = {
				jsonrpc: "2.0",
				id: {},
				method: "test.method",
			};

			expect(() => pipe.transform(request)).toThrow(JsonRpcException);
			try {
				pipe.transform(request);
			} catch (error) {
				expect(error).toBeInstanceOf(JsonRpcException);
				expect((error as JsonRpcException).getRpcErrorCode()).toBe(
					JsonRpcErrorCode.INVALID_REQUEST
				);
			}
		});

		it("должен выбросить JsonRpcException для params не объекта", () => {
			const request = {
				jsonrpc: "2.0",
				id: 1,
				method: "test.method",
				params: "invalid",
			};

			expect(() => pipe.transform(request)).toThrow(JsonRpcException);
			try {
				pipe.transform(request);
			} catch (error) {
				expect(error).toBeInstanceOf(JsonRpcException);
				expect((error as JsonRpcException).getRpcErrorCode()).toBe(
					JsonRpcErrorCode.INVALID_REQUEST
				);
			}
		});

		it("должен выбросить JsonRpcException для params null", () => {
			const request = {
				jsonrpc: "2.0",
				id: 1,
				method: "test.method",
				params: null,
			};

			expect(() => pipe.transform(request)).toThrow(JsonRpcException);
		});
	});

	describe("игнорирование NestJS метаданных", () => {
		it("должен вернуть объект как есть если содержит constructorRef", () => {
			const request = {
				constructorRef: {},
				handler: {},
				contextType: "http",
			};

			const result = pipe.transform(request);

			expect(result).toBe(request);
		});

		it("должен вернуть объект как есть если содержит handler", () => {
			const request = {
				handler: {},
			};

			const result = pipe.transform(request);

			expect(result).toBe(request);
		});

		it("должен вернуть объект как есть если содержит contextType", () => {
			const request = {
				contextType: "http",
			};

			const result = pipe.transform(request);

			expect(result).toBe(request);
		});
	});

	describe("edge cases", () => {
		it("должен обработать запрос с пустым params объектом", () => {
			const request = {
				jsonrpc: "2.0",
				id: 1,
				method: "test.method",
				params: {},
			};

			const result = pipe.transform(request);

			expect(result.params).toEqual({});
		});

		it("должен обработать запрос с массивом в params", () => {
			const request = {
				jsonrpc: "2.0",
				id: 1,
				method: "test.method",
				params: { items: [1, 2, 3] },
			};

			const result = pipe.transform(request);

			expect(result.params).toEqual({ items: [1, 2, 3] });
		});

		it("должен обработать запрос с вложенными объектами в params", () => {
			const request = {
				jsonrpc: "2.0",
				id: 1,
				method: "test.method",
				params: {
					nested: {
						deep: {
							value: "test",
						},
					},
				},
			};

			const result = pipe.transform(request);

			expect(result.params).toEqual({
				nested: {
					deep: {
						value: "test",
					},
				},
			});
		});

		it("должен включить requestId в data при ошибке версии jsonrpc", () => {
			const request = {
				jsonrpc: "1.0",
				id: "test-id",
				method: "test.method",
			};

			try {
				pipe.transform(request);
				expect(true).toBe(false);
			} catch (error) {
				const rpcData = (error as JsonRpcException).getRpcData();
				expect(rpcData).toEqual({ requestId: "test-id" });
			}
		});

		it("должен включить requestId в data при ошибке method", () => {
			const request = {
				jsonrpc: "2.0",
				id: 42,
				method: null,
			};

			try {
				pipe.transform(request);
				expect(true).toBe(false);
			} catch (error) {
				const rpcData = (error as JsonRpcException).getRpcData();
				expect(rpcData).toEqual({ requestId: 42 });
			}
		});
	});
});
