import { describe, it, expect } from "@jest/globals";
import { HttpException, HttpStatus } from "@nestjs/common";
import SocketError from "src/errors/socket.error";

describe("SocketError", () => {
	describe("конструктор", () => {
		it("должен создать ошибку с сообщением", () => {
			const error = new SocketError("Test error message");

			expect(error).toBeInstanceOf(SocketError);
			expect(error).toBeInstanceOf(HttpException);
			expect(error.message).toBe("Test error message");
			expect(error.name).toBe("SocketError");
			expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
		});

		it("должен создать ошибку со всеми параметрами", () => {
			const originalError = new Error("Original error");
			const error = new SocketError("Test error", originalError);

			expect(error.message).toBe("Test error");
			expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
		});

		it("должен сохранить originalError в конструкторе", () => {
			const originalError = new Error("Original error");
			const error = new SocketError("Test error", originalError);

			expect(error).toBeInstanceOf(SocketError);
			expect(error.message).toBe("Test error");
		});

		it("должен сохранить originalError при создании через fromUnknown", () => {
			const originalError = new Error("Original error message");
			const error = SocketError.fromUnknown(originalError);

			expect(error).toBeInstanceOf(SocketError);
			expect(error.message).toBe("Original error message");
		});
	});

	describe("fromUnknown", () => {
		it("должен создать SocketError из Error", () => {
			const originalError = new Error("Original error message");
			const error = SocketError.fromUnknown(originalError);

			expect(error).toBeInstanceOf(SocketError);
			expect(error).toBeInstanceOf(HttpException);
			expect(error.message).toBe("Original error message");
		});

		it("должен создать SocketError из строки", () => {
			const error = SocketError.fromUnknown("String error");

			expect(error).toBeInstanceOf(SocketError);
			expect(error.message).toBe("String error");
		});

		it("должен создать SocketError из числа", () => {
			const error = SocketError.fromUnknown(123);

			expect(error).toBeInstanceOf(SocketError);
			expect(error.message).toBe("123");
		});

		it("должен вернуть тот же SocketError если передан SocketError", () => {
			const originalError = new SocketError("Original SocketError");
			const error = SocketError.fromUnknown(originalError);

			expect(error).toBe(originalError);
		});

		it("должен создать SocketError из объекта", () => {
			const errorObject = { code: 500, message: "Server error" };
			const error = SocketError.fromUnknown(errorObject);

			expect(error).toBeInstanceOf(SocketError);
			expect(error.message).toBe("[object Object]");
		});

		it("должен создать SocketError из объекта с message", () => {
			const errorObject = { message: "Server error" };
			const error = SocketError.fromUnknown(errorObject);

			expect(error).toBeInstanceOf(SocketError);
			expect(error.message).toBe("[object Object]");
		});

		it("должен создать SocketError из null", () => {
			const error = SocketError.fromUnknown(null);

			expect(error).toBeInstanceOf(SocketError);
			expect(error.message).toBe("null");
		});

		it("должен создать SocketError из undefined", () => {
			const error = SocketError.fromUnknown(undefined);

			expect(error).toBeInstanceOf(SocketError);
			expect(error.message).toBe("undefined");
		});
	});

	describe("getResponse", () => {
		it("должен вернуть структурированный ответ с error и message", () => {
			const error = new SocketError("Test error message");
			const response = error.getResponse();

			expect(response).toEqual({
				error: "WebSocketError",
				message: "Test error message",
			});
		});
	});

	describe("instanceof", () => {
		it("должен правильно работать с instanceof HttpException", () => {
			const error = new SocketError("Test");

			expect(error instanceof HttpException).toBe(true);
		});

		it("должен правильно работать с instanceof SocketError", () => {
			const error = new SocketError("Test");

			expect(error instanceof SocketError).toBe(true);
		});

		it("должен правильно работать с instanceof для ошибок созданных через fromUnknown", () => {
			const error = SocketError.fromUnknown(new Error("Test"));

			expect(error instanceof HttpException).toBe(true);
			expect(error instanceof SocketError).toBe(true);
		});
	});
});
