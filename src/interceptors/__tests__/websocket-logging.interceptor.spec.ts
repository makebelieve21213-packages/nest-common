import { of, throwError } from "rxjs";
import SocketError from "src/errors/socket.error";
import WebSocketLoggingInterceptor from "src/interceptors/websocket-logging.interceptor";

import type { LoggerService } from "@makebelieve21213-packages/logger";
import type { ExecutionContext } from "@nestjs/common";

describe("WebSocketLoggingInterceptor", () => {
	let handler: WebSocketLoggingInterceptor;
	let loggerService: jest.Mocked<LoggerService>;
	let executionContext: jest.Mocked<ExecutionContext>;
	let callHandler: { handle: jest.Mock };
	let mockClient: { id: string };

	beforeEach(() => {
		loggerService = {
			log: jest.fn(),
			error: jest.fn(),
			warn: jest.fn(),
			debug: jest.fn(),
			setContext: jest.fn(),
		} as unknown as jest.Mocked<LoggerService>;

		handler = new WebSocketLoggingInterceptor(loggerService);

		mockClient = {
			id: "test-client-id",
		};

		executionContext = {
			switchToWs: jest.fn(),
		} as unknown as jest.Mocked<ExecutionContext>;

		callHandler = {
			handle: jest.fn(),
		};
	});

	describe("конструктор", () => {
		it("должен создать экземпляр обработчика", () => {
			expect(handler).toBeInstanceOf(WebSocketLoggingInterceptor);
		});
	});

	describe("intercept", () => {
		it("должен логировать входящий WebSocket запрос и успешное выполнение", (done) => {
			executionContext.switchToWs = jest.fn().mockReturnValue({
				getClient: jest.fn().mockReturnValue(mockClient),
				getData: jest.fn().mockReturnValue({ test: "data" }),
				getPattern: jest.fn().mockReturnValue("test-pattern"),
			});

			callHandler.handle.mockReturnValue(of({ result: "success" }));

			const result = handler.intercept(executionContext, callHandler as never);

			result.subscribe({
				next: (value) => {
					expect(value).toEqual({ result: "success" });
					expect(loggerService.log).toHaveBeenCalledWith(
						expect.stringContaining("[WS] Incoming event [pattern: test-pattern]")
					);
					expect(loggerService.log).toHaveBeenCalledWith(
						expect.stringContaining("[WS] Event completed [pattern: test-pattern")
					);
					done();
				},
			});
		});

		it("должен логировать ошибку при неудачном выполнении WebSocket запроса", (done) => {
			const error = new SocketError("Test error");
			executionContext.switchToWs = jest.fn().mockReturnValue({
				getClient: jest.fn().mockReturnValue(mockClient),
				getData: jest.fn().mockReturnValue({ test: "data" }),
				getPattern: jest.fn().mockReturnValue("test-pattern"),
			});

			callHandler.handle.mockReturnValue(throwError(() => error));

			const result = handler.intercept(executionContext, callHandler as never);

			result.subscribe({
				error: (err) => {
					expect(err).toBe(error);
					expect(loggerService.log).toHaveBeenCalledWith(
						expect.stringContaining("[WS] Incoming event [pattern: test-pattern]")
					);
					expect(loggerService.error).toHaveBeenCalledWith(
						expect.stringContaining("[WS] Event failed [pattern: test-pattern")
					);
					done();
				},
			});
		});

		it("должен использовать 'unknown' pattern, если pattern не найден", (done) => {
			executionContext.switchToWs = jest.fn().mockReturnValue({
				getClient: jest.fn().mockReturnValue(mockClient),
				getData: jest.fn().mockReturnValue({ test: "data" }),
				getPattern: jest.fn().mockReturnValue(null),
			});

			callHandler.handle.mockReturnValue(of({ result: "success" }));

			const result = handler.intercept(executionContext, callHandler as never);

			result.subscribe({
				next: () => {
					expect(loggerService.log).toHaveBeenCalledWith(
						expect.stringContaining("[WS] Incoming event [pattern: unknown]")
					);
					done();
				},
			});
		});

		it("должен использовать 'unknown' clientId, если client.id отсутствует", (done) => {
			const clientWithoutId = {};
			executionContext.switchToWs = jest.fn().mockReturnValue({
				getClient: jest.fn().mockReturnValue(clientWithoutId),
				getData: jest.fn().mockReturnValue({ test: "data" }),
				getPattern: jest.fn().mockReturnValue("test-pattern"),
			});

			callHandler.handle.mockReturnValue(of({ result: "success" }));

			const result = handler.intercept(executionContext, callHandler as never);

			result.subscribe({
				next: () => {
					expect(loggerService.log).toHaveBeenCalledWith(expect.stringContaining("client [unknown]"));
					done();
				},
			});
		});

		it("должен обработать ошибку не типа Error", (done) => {
			const error = "String error";
			executionContext.switchToWs = jest.fn().mockReturnValue({
				getClient: jest.fn().mockReturnValue(mockClient),
				getData: jest.fn().mockReturnValue({ test: "data" }),
				getPattern: jest.fn().mockReturnValue("test-pattern"),
			});

			callHandler.handle.mockReturnValue(throwError(() => error));

			const result = handler.intercept(executionContext, callHandler as never);

			result.subscribe({
				error: () => {
					expect(loggerService.error).toHaveBeenCalledWith(expect.stringContaining("String error"));
					done();
				},
			});
		});
	});
});
