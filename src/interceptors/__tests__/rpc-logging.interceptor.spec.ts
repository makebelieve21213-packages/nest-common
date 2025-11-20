import { of, throwError } from "rxjs";
import RpcLoggingInterceptor from "src/interceptors/rpc-logging.interceptor";

import type { LoggerService } from "@makebelieve21213-packages/logger";
import type { ExecutionContext } from "@nestjs/common";
import type { RmqContext } from "@nestjs/microservices";

describe("RpcLoggingInterceptor", () => {
	let handler: RpcLoggingInterceptor;
	let loggerService: jest.Mocked<LoggerService>;
	let executionContext: jest.Mocked<ExecutionContext>;
	let callHandler: { handle: jest.Mock };

	beforeEach(() => {
		loggerService = {
			log: jest.fn(),
			error: jest.fn(),
			warn: jest.fn(),
			debug: jest.fn(),
			setContext: jest.fn(),
		} as unknown as jest.Mocked<LoggerService>;

		handler = new RpcLoggingInterceptor(loggerService);

		executionContext = {
			switchToRpc: jest.fn(),
		} as unknown as jest.Mocked<ExecutionContext>;

		callHandler = {
			handle: jest.fn(),
		};
	});

	describe("конструктор", () => {
		it("должен создать экземпляр обработчика", () => {
			expect(handler).toBeInstanceOf(RpcLoggingInterceptor);
		});
	});

	describe("intercept", () => {
		it("должен логировать входящий RPC запрос и успешное выполнение", (done) => {
			const pattern = "test.pattern";
			const rmqContext = {
				getChannelRef: jest.fn(),
				getMessage: jest.fn(),
				getPattern: jest.fn().mockReturnValue(pattern),
			} as unknown as RmqContext;

			executionContext.switchToRpc = jest.fn().mockReturnValue({
				getContext: jest.fn().mockReturnValue(rmqContext),
			});

			callHandler.handle.mockReturnValue(of({ result: "success" }));

			const result = handler.intercept(executionContext, callHandler as never);

			result.subscribe({
				next: (value) => {
					expect(value).toEqual({ result: "success" });
					expect(loggerService.log).toHaveBeenCalledWith(
						expect.stringContaining(`[RPC] Incoming request [pattern: ${pattern}]`)
					);
					expect(loggerService.log).toHaveBeenCalledWith(
						expect.stringContaining(`[RPC] Request completed [pattern: ${pattern}`)
					);
					done();
				},
			});
		});

		it("должен логировать ошибку при неудачном выполнении RPC запроса", (done) => {
			const pattern = "test.pattern";
			const rmqContext = {
				getChannelRef: jest.fn(),
				getMessage: jest.fn(),
				getPattern: jest.fn().mockReturnValue(pattern),
			} as unknown as RmqContext;

			const error = new Error("Test error");

			executionContext.switchToRpc = jest.fn().mockReturnValue({
				getContext: jest.fn().mockReturnValue(rmqContext),
			});

			callHandler.handle.mockReturnValue(throwError(() => error));

			const result = handler.intercept(executionContext, callHandler as never);

			result.subscribe({
				error: (err) => {
					expect(err).toBe(error);
					expect(loggerService.log).toHaveBeenCalledWith(
						expect.stringContaining(`[RPC] Incoming request [pattern: ${pattern}]`)
					);
					expect(loggerService.error).toHaveBeenCalledWith(
						expect.stringContaining(`[RPC] Request failed [pattern: ${pattern}`)
					);
					done();
				},
			});
		});

		it("должен использовать 'unknown' pattern, если pattern не найден", (done) => {
			const rmqContext = {
				getChannelRef: jest.fn(),
				getMessage: jest.fn(),
				getPattern: jest.fn().mockReturnValue(null),
			} as unknown as RmqContext;

			executionContext.switchToRpc = jest.fn().mockReturnValue({
				getContext: jest.fn().mockReturnValue(rmqContext),
			});

			callHandler.handle.mockReturnValue(of({ result: "success" }));

			const result = handler.intercept(executionContext, callHandler as never);

			result.subscribe({
				next: () => {
					expect(loggerService.log).toHaveBeenCalledWith(
						expect.stringContaining("[RPC] Incoming request [pattern: unknown]")
					);
					done();
				},
			});
		});

		it("должен обработать ошибку не типа Error", (done) => {
			const pattern = "test.pattern";
			const rmqContext = {
				getChannelRef: jest.fn(),
				getMessage: jest.fn(),
				getPattern: jest.fn().mockReturnValue(pattern),
			} as unknown as RmqContext;

			const error = "String error";

			executionContext.switchToRpc = jest.fn().mockReturnValue({
				getContext: jest.fn().mockReturnValue(rmqContext),
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
