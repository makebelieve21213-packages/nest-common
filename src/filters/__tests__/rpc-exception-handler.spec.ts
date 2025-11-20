import { createLoggerServiceMock } from "src/__tests__/mocks/logger-service.mock";
import RpcError from "src/errors/rpc.error";
import RpcExceptionFilter from "src/filters/rpc-exception-handler";
import { ContextType } from "src/types/context-types";

import type { LoggerService } from "@makebelieve21213-packages/logger";
import type { ArgumentsHost } from "@nestjs/common";
import type { RmqContext } from "@nestjs/microservices";

describe("RpcExceptionFilter", () => {
	let handler: RpcExceptionFilter;
	let mockLoggerService: jest.Mocked<LoggerService>;
	let mockArgumentsHost: jest.Mocked<ArgumentsHost>;
	let mockRmqContext: jest.Mocked<RmqContext>;
	let mockChannel: {
		nack: jest.Mock;
		publish: jest.Mock;
		ack: jest.Mock;
	};
	let mockMessage: {
		properties: {
			headers: Record<string, unknown>;
		};
		fields?: {
			routingKey?: string;
		};
		content?: Buffer;
	};

	beforeEach(() => {
		mockLoggerService = createLoggerServiceMock();

		mockChannel = {
			nack: jest.fn(),
			publish: jest.fn(),
			ack: jest.fn(),
		};

		mockMessage = {
			properties: {
				headers: {},
			},
			fields: {
				routingKey: "test.routing.key",
			},
			content: Buffer.from("test content"),
		};

		mockRmqContext = {
			getChannelRef: jest.fn().mockReturnValue(mockChannel),
			getMessage: jest.fn().mockReturnValue(mockMessage),
			getPattern: jest.fn().mockReturnValue("test.pattern"),
		} as unknown as jest.Mocked<RmqContext>;

		mockArgumentsHost = {
			getType: jest.fn().mockReturnValue(ContextType.RPC),
			switchToRpc: jest.fn().mockReturnValue({
				getContext: jest.fn().mockReturnValue(mockRmqContext),
			}),
		} as unknown as jest.Mocked<ArgumentsHost>;

		handler = new RpcExceptionFilter(mockLoggerService);
	});

	describe("конструктор", () => {
		it("должен установить контекст логгера", () => {
			const exception = new Error("Test error");
			handler.handleException(exception, mockArgumentsHost);

			expect(mockLoggerService.setContext).toHaveBeenCalledWith("RpcExceptionFilter");
		});

		it("должен использовать дефолтный dlxExchange если не передан", () => {
			const newHandler = new RpcExceptionFilter(mockLoggerService);
			expect(newHandler).toBeInstanceOf(RpcExceptionFilter);
		});

		it("должен использовать кастомный dlxExchange если передан", () => {
			const customDlxExchange = "custom.dlx.exchange";
			const newHandler = new RpcExceptionFilter(mockLoggerService, customDlxExchange);
			expect(newHandler).toBeInstanceOf(RpcExceptionFilter);
		});

		it("должен использовать дефолтный dlxExchange если передан undefined", () => {
			const newHandler = new RpcExceptionFilter(mockLoggerService, undefined);
			expect(newHandler).toBeInstanceOf(RpcExceptionFilter);
			// Проверяем, что используется дефолтный dlxExchange
			const exception = new Error("Test error");
			const rpcError = RpcError.fromUnknown(exception);
			jest.spyOn(RpcError, "fromUnknown").mockReturnValue(rpcError);
			jest.spyOn(rpcError, "isTransient").mockReturnValue(false);
			expect(() => {
				newHandler.handleException(exception, mockArgumentsHost);
			}).toThrow(rpcError);
			expect(mockChannel.publish).toHaveBeenCalledWith(
				"events_exchange.dlx",
				expect.any(String),
				expect.any(Buffer),
				expect.any(Object)
			);
		});

		it("должен покрыть строку 16 - параметр loggerService конструктора", () => {
			// Явно создаем экземпляр с моком логгера для покрытия параметра конструктора
			const testLoggerService = createLoggerServiceMock();
			const testHandler = new RpcExceptionFilter(testLoggerService);
			expect(testHandler).toBeInstanceOf(RpcExceptionFilter);
			// Вызываем метод, чтобы убедиться, что мок используется
			const exception = new Error("Test error");
			testHandler.handleException(exception, mockArgumentsHost);
			expect(testLoggerService.setContext).toHaveBeenCalled();
		});

		it("должен покрыть строку 13 - параметр loggerService конструктора при создании без dlxExchange", () => {
			// Покрываем строку 13 - параметр loggerService конструктора
			const testLoggerService = createLoggerServiceMock();
			const testHandler = new RpcExceptionFilter(testLoggerService);
			expect(testHandler).toBeInstanceOf(RpcExceptionFilter);
			// Проверяем, что дефолтный dlxExchange установлен
			const exception = new Error("Test error");
			const rpcError = RpcError.fromUnknown(exception);
			jest.spyOn(RpcError, "fromUnknown").mockReturnValue(rpcError);
			jest.spyOn(rpcError, "isTransient").mockReturnValue(false);
			expect(() => {
				testHandler.handleException(exception, mockArgumentsHost);
			}).toThrow(rpcError);
			expect(mockChannel.publish).toHaveBeenCalledWith(
				"events_exchange.dlx",
				expect.any(String),
				expect.any(Buffer),
				expect.any(Object)
			);
		});
	});

	describe("handleException", () => {
		it("должен пробросить исключение если ctx отсутствует", () => {
			(mockArgumentsHost.switchToRpc as jest.Mock).mockReturnValue({
				getContext: jest.fn().mockReturnValue(undefined),
			});
			const exception = new Error("Test error");

			expect(() => {
				handler.handleException(exception, mockArgumentsHost);
			}).toThrow("Test error");
		});

		it("должен отправить постоянную ошибку в DLX сразу", () => {
			const exception = new Error("Bad request");
			const rpcError = RpcError.fromUnknown(exception);
			jest.spyOn(RpcError, "fromUnknown").mockReturnValue(rpcError);
			jest.spyOn(rpcError, "isTransient").mockReturnValue(false);

			expect(() => {
				handler.handleException(exception, mockArgumentsHost);
			}).toThrow(rpcError);

			expect(mockChannel.publish).toHaveBeenCalledWith(
				"events_exchange.dlx",
				"test.routing.key",
				Buffer.from("test content"),
				{
					headers: {},
				}
			);
			expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
		});

		it("должен requeue временную ошибку если retries < MAX_RETRIES", () => {
			const exception = new Error("Timeout");
			const rpcError = RpcError.fromUnknown(exception);
			jest.spyOn(RpcError, "fromUnknown").mockReturnValue(rpcError);
			jest.spyOn(rpcError, "isTransient").mockReturnValue(true);
			mockMessage.properties.headers = {};

			handler.handleException(exception, mockArgumentsHost);

			expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, false);
		});

		it("должен отправить временную ошибку в DLX если retries >= MAX_RETRIES", () => {
			const exception = new Error("Timeout");
			const rpcError = RpcError.fromUnknown(exception);
			jest.spyOn(RpcError, "fromUnknown").mockReturnValue(rpcError);
			jest.spyOn(rpcError, "isTransient").mockReturnValue(true);
			mockMessage.properties.headers = {
				"x-death": [{ count: 2 }],
			};

			expect(() => {
				handler.handleException(exception, mockArgumentsHost);
			}).toThrow(rpcError);

			expect(mockChannel.publish).toHaveBeenCalled();
			expect(mockChannel.ack).toHaveBeenCalled();
		});

		it("должен использовать 'unknown' pattern если getPattern возвращает undefined", () => {
			(mockRmqContext.getPattern as jest.Mock).mockReturnValue(undefined);
			const exception = new Error("Test error");
			const rpcError = RpcError.fromUnknown(exception);
			jest.spyOn(RpcError, "fromUnknown").mockReturnValue(rpcError);
			jest.spyOn(rpcError, "isTransient").mockReturnValue(false);

			expect(() => {
				handler.handleException(exception, mockArgumentsHost);
			}).toThrow(rpcError);

			expect(mockLoggerService.error).toHaveBeenCalledWith(expect.stringContaining("[unknown]"));
		});

		it("должен логировать stack trace если exception имеет stack", () => {
			const exception = new Error("Test error");
			exception.stack = "Error: Test error\n    at test.js:1:1";
			const rpcError = RpcError.fromUnknown(exception);
			jest.spyOn(RpcError, "fromUnknown").mockReturnValue(rpcError);
			jest.spyOn(rpcError, "isTransient").mockReturnValue(false);

			expect(() => {
				handler.handleException(exception, mockArgumentsHost);
			}).toThrow(rpcError);

			expect(mockLoggerService.error).toHaveBeenCalledWith(
				expect.stringContaining("Stack: Error: Test error")
			);
		});

		it("должен логировать пустой stack если exception является Error но stack отсутствует", () => {
			const exception = new Error("Test error");
			delete (exception as { stack?: string }).stack;
			const rpcError = RpcError.fromUnknown(exception);
			jest.spyOn(RpcError, "fromUnknown").mockReturnValue(rpcError);
			jest.spyOn(rpcError, "isTransient").mockReturnValue(false);

			expect(() => {
				handler.handleException(exception, mockArgumentsHost);
			}).toThrow(rpcError);

			expect(mockLoggerService.error).toHaveBeenCalledWith(expect.stringContaining("Stack: "));
		});

		it("должен логировать пустой stack если exception не является Error", () => {
			const exception = "String error";
			const rpcError = RpcError.fromUnknown(exception);
			jest.spyOn(RpcError, "fromUnknown").mockReturnValue(rpcError);
			jest.spyOn(rpcError, "isTransient").mockReturnValue(false);

			expect(() => {
				handler.handleException(exception, mockArgumentsHost);
			}).toThrow(rpcError);

			expect(mockLoggerService.error).toHaveBeenCalledWith(expect.stringContaining("Stack: "));
		});

		it("должен использовать pattern как fallback для routingKey если fields.routingKey отсутствует", () => {
			delete mockMessage.fields?.routingKey;
			const exception = new Error("Test error");
			const rpcError = RpcError.fromUnknown(exception);
			jest.spyOn(RpcError, "fromUnknown").mockReturnValue(rpcError);
			jest.spyOn(rpcError, "isTransient").mockReturnValue(false);

			expect(() => {
				handler.handleException(exception, mockArgumentsHost);
			}).toThrow(rpcError);

			expect(mockChannel.publish).toHaveBeenCalledWith(
				"events_exchange.dlx",
				"test.pattern",
				expect.any(Buffer),
				expect.any(Object)
			);
		});

		it("должен использовать пустой Buffer как fallback для content если content отсутствует", () => {
			delete mockMessage.content;
			const exception = new Error("Test error");
			const rpcError = RpcError.fromUnknown(exception);
			jest.spyOn(RpcError, "fromUnknown").mockReturnValue(rpcError);
			jest.spyOn(rpcError, "isTransient").mockReturnValue(false);

			expect(() => {
				handler.handleException(exception, mockArgumentsHost);
			}).toThrow(rpcError);

			expect(mockChannel.publish).toHaveBeenCalledWith(
				"events_exchange.dlx",
				expect.any(String),
				Buffer.from(""),
				expect.any(Object)
			);
		});

		it("должен использовать кастомный dlxExchange если передан в конструктор", () => {
			const customDlxExchange = "custom.dlx.exchange";
			const customHandler = new RpcExceptionFilter(mockLoggerService, customDlxExchange);
			const exception = new Error("Test error");
			const rpcError = RpcError.fromUnknown(exception);
			jest.spyOn(RpcError, "fromUnknown").mockReturnValue(rpcError);
			jest.spyOn(rpcError, "isTransient").mockReturnValue(false);

			expect(() => {
				customHandler.handleException(exception, mockArgumentsHost);
			}).toThrow(rpcError);

			expect(mockChannel.publish).toHaveBeenCalledWith(
				customDlxExchange,
				expect.any(String),
				expect.any(Buffer),
				expect.any(Object)
			);
		});
	});
});
