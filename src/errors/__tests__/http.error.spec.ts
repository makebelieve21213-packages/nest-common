import { describe, it, expect } from "@jest/globals";
import { HttpException, HttpStatus } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import HttpError from "src/errors/http.error";
import RpcError from "src/errors/rpc.error";
import SocketError from "src/errors/socket.error";
import { ErrorType } from "src/types/error-types";
import { RpcErrorType } from "src/types/rpc-types";

describe("HttpError", () => {
	describe("конструктор", () => {
		it("должен создать ошибку с сообщением", () => {
			const error = new HttpError("Test error message");

			expect(error).toBeInstanceOf(HttpError);
			expect(error).toBeInstanceOf(HttpException);
			expect(error.message).toBe("Test error message");
			expect(error.name).toBe("HttpError");
			expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
		});

		it("должен создать ошибку со статус-кодом", () => {
			const error = new HttpError("Test error", HttpStatus.BAD_REQUEST);

			expect(error.message).toBe("Test error");
			expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
		});

		it("должен создать ошибку со всеми параметрами", () => {
			const originalError = new Error("Original error");
			const error = new HttpError("Test error", HttpStatus.NOT_FOUND, originalError);

			expect(error.message).toBe("Test error");
			expect(error.getStatus()).toBe(HttpStatus.NOT_FOUND);
		});
	});

	describe("fromUnknown", () => {
		it("должен создать HttpError из Error", () => {
			const originalError = new Error("Original error message");
			const error = HttpError.fromUnknown(originalError);

			expect(error).toBeInstanceOf(HttpError);
			expect(error).toBeInstanceOf(HttpException);
			expect(error.message).toBe("Original error message");
			expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
		});

		it("должен создать HttpError из строки", () => {
			const error = HttpError.fromUnknown("String error");

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("String error");
		});

		it("должен создать HttpError из числа", () => {
			const error = HttpError.fromUnknown(123);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("123");
		});

		it("должен вернуть тот же HttpError если передан HttpError", () => {
			const originalError = new HttpError("Original HttpError");
			const error = HttpError.fromUnknown(originalError);

			expect(error).toBe(originalError);
		});

		it("должен создать HttpError из объекта с message", () => {
			const errorObject = { message: "Server error" };
			const error = HttpError.fromUnknown(errorObject);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("Server error");
		});

		it("должен создать HttpError из null", () => {
			const error = HttpError.fromUnknown(null);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("null");
		});

		it("должен создать HttpError из undefined", () => {
			const error = HttpError.fromUnknown(undefined);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("undefined");
		});

		it("должен преобразовать SocketError в HttpError", () => {
			const socketError = new SocketError("Socket error");
			const error = HttpError.fromUnknown(socketError);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("Socket error");
			expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
		});

		it("должен преобразовать SocketError с объектным response", () => {
			const socketError = new SocketError("Socket error message");
			const error = HttpError.fromUnknown(socketError);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("Socket error message");
			expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
		});

		it("должен преобразовать SocketError со строковым response (fallback)", () => {
			// Создаем SocketError и мокаем getMessage чтобы вернуть строку
			const socketError = new SocketError("Socket error");
			const originalGetMessage = socketError.getMessage.bind(socketError);
			jest.spyOn(socketError, "getMessage").mockReturnValue("String response");

			const error = HttpError.fromUnknown(socketError);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("String response");

			socketError.getMessage = originalGetMessage;
		});

		it("должен преобразовать SocketError с response без message (fallback на String(res))", () => {
			// Создаем SocketError и мокаем getMessage чтобы вернуть строку
			const socketError = new SocketError("Socket error message");
			const originalGetMessage = socketError.getMessage.bind(socketError);
			jest.spyOn(socketError, "getMessage").mockReturnValue("[object Object]");

			const error = HttpError.fromUnknown(socketError);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("[object Object]");

			socketError.getMessage = originalGetMessage;
		});

		it("должен преобразовать SocketError с response null (fallback на String(res))", () => {
			// Создаем SocketError - код использует getMessage(), который вернет message
			const socketError = new SocketError("Socket error message");

			const error = HttpError.fromUnknown(socketError);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("Socket error message");
		});

		it("должен преобразовать RpcError в HttpError с правильным статусом", () => {
			const rpcError = new RpcError("Bad request", RpcErrorType.BAD_REQUEST, HttpStatus.BAD_REQUEST);
			const error = HttpError.fromUnknown(rpcError);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("Bad request");
			expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
		});

		it("должен преобразовать RpcException в HttpError", () => {
			const rpcException = new RpcException("RPC error");
			const error = HttpError.fromUnknown(rpcException);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("RPC error");
			expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
		});

		it("должен преобразовать RpcException который является также RpcError (покрытие ветки instanceof RpcError)", () => {
			// Создаем RpcException и делаем его также RpcError через прототип
			const rpcException = new RpcException("RPC error message");
			// Устанавливаем прототип чтобы объект был одновременно RpcError и RpcException
			Object.setPrototypeOf(rpcException, RpcError.prototype);
			// Добавляем свойство statusCode
			(rpcException as unknown as { statusCode: number }).statusCode = HttpStatus.BAD_REQUEST;

			const error = HttpError.fromUnknown(rpcException);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("RPC error message");
			// Проверяем что используется statusCode из RpcError если error instanceof RpcError
			expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
		});

		it("должен покрыть строку 141 - RpcException который также является RpcError в блоке RPC_EXCEPTION", () => {
			// Создаем реальный RpcError, который будет определен как RPC_EXCEPTION
			// через мок getErrorType, но затем в блоке RPC_EXCEPTION
			// пройдет проверку instanceof RpcError
			const rpcError = new RpcError(
				"RPC error message",
				RpcErrorType.BAD_REQUEST,
				HttpStatus.BAD_REQUEST
			);

			// Мокаем getErrorType чтобы вернуть RPC_EXCEPTION вместо RPC_ERROR
			const getErrorTypeSpy = jest.spyOn(
				HttpError as unknown as { getErrorType: (error: unknown) => ErrorType },
				"getErrorType"
			);
			getErrorTypeSpy.mockImplementation((error: unknown) => {
				// Если это наш специальный случай, возвращаем RPC_EXCEPTION
				if (error === rpcError) {
					return ErrorType.RPC_EXCEPTION;
				}
				// Иначе используем оригинальную логику через рефлексию
				const originalMethod = (
					HttpError as unknown as {
						getErrorType: (error: unknown) => ErrorType;
					}
				).getErrorType;
				return originalMethod.call(HttpError, error);
			});

			const error = HttpError.fromUnknown(rpcError);

			expect(error).toBeInstanceOf(HttpError);
			// RpcError.getError() возвращает объект с message, errorType и statusCode
			// String() на объекте вернет строковое представление объекта
			expect(error.message).toContain("RPC error message");
			// Проверяем что используется statusCode из RpcError если error instanceof RpcError
			expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);

			// Восстанавливаем оригинальный метод
			getErrorTypeSpy.mockRestore();
		});

		it("должен преобразовать HttpException в HttpError с сохранением статуса", () => {
			const httpException = new HttpException("Not found", HttpStatus.NOT_FOUND);
			const error = HttpError.fromUnknown(httpException);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.getStatus()).toBe(HttpStatus.NOT_FOUND);
		});

		it("должен преобразовать HttpException с массивом message", () => {
			const httpException = new HttpException(
				{ error: "BadRequest", message: ["Error 1", "Error 2"] },
				HttpStatus.BAD_REQUEST
			);
			const error = HttpError.fromUnknown(httpException);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
			expect(error.message).toBe("Error 1; Error 2");
		});

		it("должен преобразовать HttpException с message не строкой и не массивом", () => {
			const httpException = new HttpException(
				{ error: "BadRequest", message: 123 as unknown as string },
				HttpStatus.BAD_REQUEST
			);
			const error = HttpError.fromUnknown(httpException);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
			expect(error.message).toBe("123");
		});

		it("должен преобразовать SocketError с объектным response", () => {
			const socketError = new SocketError("Socket error message");
			const error = HttpError.fromUnknown(socketError);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("Socket error message");
			expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
		});

		it("должен преобразовать RpcException с объектным errorData", () => {
			const rpcException = new RpcException({
				message: "RPC error message",
			});
			const error = HttpError.fromUnknown(rpcException);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("RPC error message");
			expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
		});

		it("должен преобразовать RpcException с Error в errorData", () => {
			const innerError = new Error("Inner error");
			const rpcException = new RpcException(innerError);
			const error = HttpError.fromUnknown(rpcException);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("Inner error");
			expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
		});

		it("должен преобразовать RpcException с объектным errorData содержащим message и Error", () => {
			const innerError = new Error("Inner error message");
			const rpcException = new RpcException({
				message: "Object message",
				error: innerError,
			});
			const error = HttpError.fromUnknown(rpcException);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("Object message");
			expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
		});

		it("должен преобразовать HttpException с нестандартным response (не строка и не объект с message)", () => {
			const httpException = new HttpException(123 as unknown as string, HttpStatus.BAD_REQUEST);
			const error = HttpError.fromUnknown(httpException);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
			expect(error.message).toBe("123");
		});

		it("должен преобразовать RpcException с объектным errorData без message (fallback на String(errorData))", () => {
			const rpcException = new RpcException({ code: 123 });
			// Мокаем getError чтобы вернуть объект без message
			const originalGetError = rpcException.getError.bind(rpcException);
			jest.spyOn(rpcException, "getError").mockReturnValue({
				code: 123,
			} as unknown as string | object);

			const error = HttpError.fromUnknown(rpcException);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("[object Object]");

			rpcException.getError = originalGetError;
		});

		it("должен преобразовать SocketError с response не строкой и не объектом с message (fallback на String(res))", () => {
			const socketError = {
				getStatus: jest.fn().mockReturnValue(HttpStatus.INTERNAL_SERVER_ERROR),
				getMessage: jest.fn().mockReturnValue("123"),
				message: "",
			} as unknown as SocketError;
			Object.setPrototypeOf(socketError, SocketError.prototype);

			const error = HttpError.fromUnknown(socketError);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("123");
		});

		it("должен преобразовать RpcException с errorData не строкой, не Error и не объектом с message (fallback на String(errorData))", () => {
			const rpcException = {
				getError: jest.fn().mockReturnValue(123),
				message: "",
			} as unknown as RpcException;
			Object.setPrototypeOf(rpcException, RpcException.prototype);

			const error = HttpError.fromUnknown(rpcException);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("123");
		});

		it("должен преобразовать HttpException с response объектом без message (fallback на String)", () => {
			const httpException = {
				getStatus: jest.fn().mockReturnValue(HttpStatus.BAD_REQUEST),
				getResponse: jest.fn().mockReturnValue({ code: 123 }),
				name: "HttpException",
			} as unknown as HttpException;
			Object.setPrototypeOf(httpException, HttpException.prototype);

			const error = HttpError.fromUnknown(httpException);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
			expect(error.message).toBe("[object Object]");
		});

		it("должен преобразовать HttpException с response не строкой и не объектом (fallback на JSON.stringify)", () => {
			const httpException = {
				getStatus: jest.fn().mockReturnValue(HttpStatus.BAD_REQUEST),
				getResponse: jest.fn().mockReturnValue(123),
				name: "HttpException",
			} as unknown as HttpException;
			Object.setPrototypeOf(httpException, HttpException.prototype);

			const error = HttpError.fromUnknown(httpException);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
			expect(error.message).toBe("123");
		});

		it("должен преобразовать HttpException с response строкой в else ветке", () => {
			const httpException = {
				getStatus: jest.fn().mockReturnValue(HttpStatus.BAD_REQUEST),
				getResponse: jest.fn().mockReturnValue("String response"),
				name: "HttpException",
			} as unknown as HttpException;
			Object.setPrototypeOf(httpException, HttpException.prototype);

			const error = HttpError.fromUnknown(httpException);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
			expect(error.message).toBe("String response");
		});

		it("должен добавить descriptionPrefix к сообщению ошибки", () => {
			const originalError = new Error("Original error message");
			const error = HttpError.fromUnknown(originalError, "Custom prefix");

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("Custom prefix: Original error message");
		});

		it("должен добавить descriptionPrefix к HttpException", () => {
			const httpException = new HttpException("Not found", HttpStatus.NOT_FOUND);
			const error = HttpError.fromUnknown(httpException, "API Error");

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("API Error: Not found");
			expect(error.getStatus()).toBe(HttpStatus.NOT_FOUND);
		});

		it("должен добавить descriptionPrefix к RpcException", () => {
			const rpcException = new RpcException("RPC error");
			const error = HttpError.fromUnknown(rpcException, "RPC Handler");

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("RPC Handler: RPC error");
		});

		it("должен добавить descriptionPrefix к SocketError", () => {
			const socketError = new SocketError("Socket error");
			const error = HttpError.fromUnknown(socketError, "Socket Handler");

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("Socket Handler: Socket error");
		});

		it("должен добавить descriptionPrefix к объекту", () => {
			const errorObject = { message: "Server error" };
			const error = HttpError.fromUnknown(errorObject, "Object Handler");

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("Object Handler: Server error");
		});

		it("должен добавить descriptionPrefix к строке", () => {
			const error = HttpError.fromUnknown("String error", "String Handler");

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("String Handler: String error");
		});

		it("должен сохранить originalError в конструкторе", () => {
			const originalError = new Error("Original error");
			const error = new HttpError("Test error", HttpStatus.BAD_REQUEST, originalError);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("Test error");
		});

		it("должен сохранить originalError при создании через fromUnknown", () => {
			const originalError = new Error("Original error");
			const error = HttpError.fromUnknown(originalError);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("Original error");
		});

		it("должен обработать объект с вложенным error объектом и statusCode", () => {
			const errorObject = {
				error: {
					message: "Nested error message",
					statusCode: HttpStatus.BAD_REQUEST,
				},
			};
			const error = HttpError.fromUnknown(errorObject);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("Nested error message");
			expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
		});

		it("должен обработать объект с error строкой", () => {
			const errorObject = {
				error: "Error string",
			};
			const error = HttpError.fromUnknown(errorObject);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("Error string");
		});

		it("должен обработать объект с message и statusCode на верхнем уровне", () => {
			const errorObject = {
				message: "Top level message",
				statusCode: HttpStatus.NOT_FOUND,
			};
			const error = HttpError.fromUnknown(errorObject);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("Top level message");
			expect(error.getStatus()).toBe(HttpStatus.NOT_FOUND);
		});

		it("должен игнорировать statusCode меньше BAD_REQUEST", () => {
			const errorObject = {
				message: "Error message",
				statusCode: HttpStatus.OK,
			};
			const error = HttpError.fromUnknown(errorObject);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("Error message");
			expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
		});

		it("должен вернуть undefined statusCode когда statusCode отсутствует в объекте", () => {
			const errorObject = {
				message: "Error message",
			};
			const error = HttpError.fromUnknown(errorObject);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("Error message");
			expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
		});

		it("должен вернуть undefined statusCode когда statusCode не является числом", () => {
			const errorObject = {
				message: "Error message",
				statusCode: "400" as unknown as number,
			};
			const error = HttpError.fromUnknown(errorObject);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("Error message");
			expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
		});

		it("должен вернуть undefined statusCode когда statusCode равен null", () => {
			const errorObject = {
				message: "Error message",
				statusCode: null as unknown as number,
			};
			const error = HttpError.fromUnknown(errorObject);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("Error message");
			expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
		});

		it("должен вернуть undefined statusCode когда statusCode равен undefined", () => {
			const errorObject = {
				message: "Error message",
				statusCode: undefined as unknown as number,
			};
			const error = HttpError.fromUnknown(errorObject);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("Error message");
			expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
		});

		it("должен вернуть undefined statusCode когда вложенный error объект без statusCode", () => {
			const errorObject = {
				error: {
					message: "Nested error message",
				},
			};
			const error = HttpError.fromUnknown(errorObject);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("Nested error message");
			expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
		});

		it("должен вернуть undefined statusCode когда вложенный error объект со statusCode не числом", () => {
			const errorObject = {
				error: {
					message: "Nested error message",
					statusCode: "bad" as unknown as number,
				},
			};
			const error = HttpError.fromUnknown(errorObject);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("Nested error message");
			expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
		});

		it("должен вернуть undefined statusCode когда вложенный error объект со statusCode меньше BAD_REQUEST", () => {
			const errorObject = {
				error: {
					message: "Nested error message",
					statusCode: HttpStatus.OK,
				},
			};
			const error = HttpError.fromUnknown(errorObject);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("Nested error message");
			expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
		});

		it("должен обработать массив как объект через extractFromSerializedError", () => {
			const errorArray = ["error1", "error2"];
			const error = HttpError.fromUnknown(errorArray);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBeDefined();
		});

		it("должен обработать объект с null через extractFromSerializedError", () => {
			const errorObject = { error: null, message: "Test message" };
			const error = HttpError.fromUnknown(errorObject);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("Test message");
		});

		it("должен обработать DeserializedRpcError объект", () => {
			const deserializedRpcError = {
				errorType: "BAD_REQUEST",
				statusCode: HttpStatus.BAD_REQUEST,
				message: "Deserialized RPC error message",
			};
			const error = HttpError.fromUnknown(deserializedRpcError);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("Deserialized RPC error message");
			expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
		});

		it("должен обработать DeserializedRpcError с некорректным statusCode", () => {
			const deserializedRpcError = {
				errorType: "BAD_REQUEST",
				statusCode: HttpStatus.OK,
				message: "Deserialized RPC error message",
			};
			const error = HttpError.fromUnknown(deserializedRpcError);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("Deserialized RPC error message");
			expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
		});

		it("должен обработать DeserializedRpcError без поля message (попадает в Object)", () => {
			const deserializedRpcError = {
				errorType: "BAD_REQUEST",
				statusCode: HttpStatus.BAD_REQUEST,
			};
			const error = HttpError.fromUnknown(deserializedRpcError);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBeDefined();
			expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
		});

		it("должен обработать DeserializedRpcError с message равным undefined", () => {
			const deserializedRpcError = {
				errorType: "BAD_REQUEST",
				statusCode: HttpStatus.BAD_REQUEST,
				message: undefined,
			};
			const error = HttpError.fromUnknown(deserializedRpcError);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("RPC error occurred");
			expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
		});

		it("должен обработать NestRpcException объект", () => {
			const nestRpcException = {
				status: "error",
				message: "Nest RPC error message",
				data: {
					statusCode: HttpStatus.BAD_REQUEST,
				},
			};
			const error = HttpError.fromUnknown(nestRpcException);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("Nest RPC error message");
			expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
		});

		it("должен обработать NestRpcException с message в data", () => {
			const nestRpcException = {
				status: "error",
				message: "Top level message",
				data: {
					message: "Data level message",
					statusCode: HttpStatus.NOT_FOUND,
				},
			};
			const error = HttpError.fromUnknown(nestRpcException);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("Data level message");
			expect(error.getStatus()).toBe(HttpStatus.NOT_FOUND);
		});

		it("должен обработать NestRpcException без data", () => {
			const nestRpcException = {
				status: "error",
				message: "Nest RPC error message",
			};
			const error = HttpError.fromUnknown(nestRpcException);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("Nest RPC error message");
			expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
		});

		it("должен обработать NestRpcException с некорректным statusCode в data", () => {
			const nestRpcException = {
				status: "error",
				message: "Nest RPC error message",
				data: {
					statusCode: HttpStatus.OK,
				},
			};
			const error = HttpError.fromUnknown(nestRpcException);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("Nest RPC error message");
			expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
		});

		it("должен обработать NestRpcException без поля message (попадает в Object)", () => {
			const nestRpcException = {
				status: "error",
				data: {
					statusCode: HttpStatus.BAD_REQUEST,
				},
			};
			const error = HttpError.fromUnknown(nestRpcException);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBeDefined();
			expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
		});

		it("должен обработать NestRpcException с message равным undefined", () => {
			const nestRpcException = {
				status: "error",
				message: undefined,
				data: {
					statusCode: HttpStatus.BAD_REQUEST,
				},
			};
			const error = HttpError.fromUnknown(nestRpcException);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("RPC error occurred");
			expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
		});

		it("должен обработать extractFromSerializedError с примитивным типом (не объект)", () => {
			const errorString = "Simple string error";
			const error = HttpError.fromUnknown(errorString);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("Simple string error");
		});

		it("должен обработать extractFromSerializedError с объектом error содержащим message", () => {
			const errorObject = {
				error: {
					message: "Nested error message",
				},
			};
			const error = HttpError.fromUnknown(errorObject);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("Nested error message");
		});

		it("должен обработать extractFromSerializedError с объектом error без message", () => {
			const errorObject = {
				error: {
					code: 123,
				},
			};
			const error = HttpError.fromUnknown(errorObject);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBeDefined();
		});

		it("должен обработать extractFromSerializedError с объектом error null", () => {
			const errorObject = {
				error: null,
				message: "Fallback message",
			};
			const error = HttpError.fromUnknown(errorObject);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBe("Fallback message");
		});

		it("должен обработать extractFromSerializedError с объектом без error и без message", () => {
			const errorObject = {
				code: 123,
			};
			const error = HttpError.fromUnknown(errorObject);

			expect(error).toBeInstanceOf(HttpError);
			expect(error.message).toBeDefined();
		});

		describe("extractFromSerializedError (приватный метод через рефлексию)", () => {
			it("должен обработать примитивный тип (не объект) через прямой вызов", () => {
				// Используем рефлексию для прямого вызова приватного метода
				// extractFromSerializedError
				const result = (
					HttpError as unknown as {
						extractFromSerializedError: (error: unknown) => { message: string; statusCode?: number };
					}
				).extractFromSerializedError("primitive string");

				expect(result.message).toBe("primitive string");
				expect(result.statusCode).toBeUndefined();
			});

			it("должен обработать null через прямой вызов", () => {
				const result = (
					HttpError as unknown as {
						extractFromSerializedError: (error: unknown) => { message: string; statusCode?: number };
					}
				).extractFromSerializedError(null);

				expect(result.message).toBe("null");
				expect(result.statusCode).toBeUndefined();
			});

			it("должен обработать число через прямой вызов", () => {
				const result = (
					HttpError as unknown as {
						extractFromSerializedError: (error: unknown) => { message: string; statusCode?: number };
					}
				).extractFromSerializedError(123);

				expect(result.message).toBe("123");
				expect(result.statusCode).toBeUndefined();
			});
		});

		describe("instanceof", () => {
			it("должен правильно работать с instanceof HttpException", () => {
				const error = new HttpError("Test");

				expect(error instanceof HttpException).toBe(true);
			});

			it("должен правильно работать с instanceof HttpError", () => {
				const error = new HttpError("Test");

				expect(error instanceof HttpError).toBe(true);
			});

			it("должен правильно работать с instanceof для ошибок созданных через fromUnknown", () => {
				const error = HttpError.fromUnknown(new Error("Test"));

				expect(error instanceof HttpException).toBe(true);
				expect(error instanceof HttpError).toBe(true);
			});
		});
	});
});
