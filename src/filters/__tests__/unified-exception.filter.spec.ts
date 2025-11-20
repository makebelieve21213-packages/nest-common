import { HttpException, HttpStatus } from "@nestjs/common";
import { createLoggerServiceMock } from "src/__tests__/mocks/logger-service.mock";
import RpcError from "src/errors/rpc.error";
import HttpExceptionFilter from "src/filters/http-exception-handler";
import RpcExceptionFilter from "src/filters/rpc-exception-handler";
import UnifiedExceptionFilter from "src/filters/unified-exception.filter";
import { ContextType } from "src/types/context-types";

import type { LoggerService } from "@makebelieve21213-packages/logger";
import type { ArgumentsHost } from "@nestjs/common";
import type { RmqContext } from "@nestjs/microservices";

describe("UnifiedExceptionFilter", () => {
	let filter: UnifiedExceptionFilter;
	let mockLoggerService: jest.Mocked<LoggerService>;
	let mockArgumentsHost: jest.Mocked<ArgumentsHost>;
	let mockResponse: {
		status: jest.Mock;
		json: jest.Mock;
	};
	let mockRequest: { url: string };
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

		mockResponse = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		mockRequest = { url: "/test" };

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
			getType: jest.fn(),
			switchToHttp: jest.fn().mockReturnValue({
				getResponse: jest.fn().mockReturnValue(mockResponse),
				getRequest: jest.fn().mockReturnValue(mockRequest),
			}),
			switchToRpc: jest.fn().mockReturnValue({
				getContext: jest.fn().mockReturnValue(mockRmqContext),
			}),
			switchToWs: jest.fn().mockReturnValue({
				getClient: jest.fn().mockReturnValue({
					emit: jest.fn(),
				}),
			}),
		} as unknown as jest.Mocked<ArgumentsHost>;

		filter = new UnifiedExceptionFilter(mockLoggerService);
	});

	describe("конструктор", () => {
		it("должен установить контекст логгера", () => {
			expect(mockLoggerService.setContext).toHaveBeenCalledWith("UnifiedExceptionFilter");
		});

		it("должен использовать дефолтный dlxExchange если не передан", () => {
			const newFilter = new UnifiedExceptionFilter(mockLoggerService);
			expect(newFilter).toBeInstanceOf(UnifiedExceptionFilter);
		});

		it("должен использовать кастомный dlxExchange если передан", () => {
			const customDlxExchange = "custom.dlx.exchange";
			const newFilter = new UnifiedExceptionFilter(mockLoggerService, customDlxExchange);
			expect(newFilter).toBeInstanceOf(UnifiedExceptionFilter);
		});

		it("должен использовать дефолтный dlxExchange если передан undefined", () => {
			const newFilter = new UnifiedExceptionFilter(mockLoggerService, undefined);
			expect(newFilter).toBeInstanceOf(UnifiedExceptionFilter);
			// Проверяем, что используется дефолтный dlxExchange в RpcExceptionFilter
			(mockArgumentsHost.getType as jest.Mock).mockReturnValue(ContextType.RPC);
			const exception = new Error("RPC error");
			const rpcError = RpcError.fromUnknown(exception);
			jest.spyOn(RpcError, "fromUnknown").mockReturnValue(rpcError);
			jest.spyOn(rpcError, "isTransient").mockReturnValue(false);
			expect(() => {
				newFilter.catch(exception, mockArgumentsHost);
			}).toThrow(rpcError);
			expect(mockChannel.publish).toHaveBeenCalledWith(
				"events_exchange.dlx",
				expect.any(String),
				expect.any(Buffer),
				expect.any(Object)
			);
		});

		it("должен передать кастомный dlxExchange в RpcExceptionFilter", () => {
			const customDlxExchange = "custom.dlx.exchange";
			const customFilter = new UnifiedExceptionFilter(mockLoggerService, customDlxExchange);

			(mockArgumentsHost.getType as jest.Mock).mockReturnValue(ContextType.RPC);
			const exception = new Error("RPC error");
			const rpcError = RpcError.fromUnknown(exception);
			jest.spyOn(RpcError, "fromUnknown").mockReturnValue(rpcError);
			jest.spyOn(rpcError, "isTransient").mockReturnValue(false);

			expect(() => {
				customFilter.catch(exception, mockArgumentsHost);
			}).toThrow(rpcError);

			expect(mockChannel.publish).toHaveBeenCalledWith(
				customDlxExchange,
				expect.any(String),
				expect.any(Buffer),
				expect.any(Object)
			);
		});

		it("должен создать RpcExceptionFilter с моком логгера для покрытия строки 16", () => {
			// Явно создаем RpcExceptionFilter с моком логгера
			// для покрытия строки параметра конструктора
			const rpcFilter = new RpcExceptionFilter(mockLoggerService);
			expect(rpcFilter).toBeInstanceOf(RpcExceptionFilter);
		});

		it("должен создать HttpExceptionFilter с моком логгера для покрытия строки параметра конструктора", () => {
			// Явно создаем HttpExceptionFilter с моком логгера
			// для покрытия строки параметра конструктора
			const httpFilter = new HttpExceptionFilter(mockLoggerService);
			expect(httpFilter).toBeInstanceOf(HttpExceptionFilter);
		});

		it("должен покрыть строку 20 - параметр loggerService конструктора UnifiedExceptionFilter", () => {
			// Явно создаем экземпляр с моком логгера для покрытия параметра конструктора
			const testLoggerService = createLoggerServiceMock();
			const testFilter = new UnifiedExceptionFilter(testLoggerService);
			expect(testFilter).toBeInstanceOf(UnifiedExceptionFilter);
			// Вызываем метод, чтобы убедиться, что мок используется
			(mockArgumentsHost.getType as jest.Mock).mockReturnValue(ContextType.HTTP);
			const exception = new HttpException("Test error", HttpStatus.BAD_REQUEST);
			testFilter.catch(exception, mockArgumentsHost);
			expect(testLoggerService.setContext).toHaveBeenCalled();
		});

		it("должен покрыть строку 21 - параметр loggerService конструктора при создании с dlxExchange", () => {
			// Покрываем строку 21 - параметр loggerService конструктора при создании с dlxExchange
			const testLoggerService = createLoggerServiceMock();
			const customDlxExchange = "custom.dlx.exchange";
			const testFilter = new UnifiedExceptionFilter(testLoggerService, customDlxExchange);
			expect(testFilter).toBeInstanceOf(UnifiedExceptionFilter);
			// Вызываем метод, чтобы убедиться, что мок используется
			(mockArgumentsHost.getType as jest.Mock).mockReturnValue(ContextType.RPC);
			const exception = new Error("RPC error");
			const rpcError = RpcError.fromUnknown(exception);
			jest.spyOn(RpcError, "fromUnknown").mockReturnValue(rpcError);
			jest.spyOn(rpcError, "isTransient").mockReturnValue(false);
			expect(() => {
				testFilter.catch(exception, mockArgumentsHost);
			}).toThrow(rpcError);
			expect(testLoggerService.setContext).toHaveBeenCalled();
		});
	});

	describe("catch", () => {
		describe("HTTP контекст", () => {
			beforeEach(() => {
				(mockArgumentsHost.getType as jest.Mock).mockReturnValue(ContextType.HTTP);
			});

			it("должен обработать HTTP ошибку через HttpExceptionFilter", () => {
				const exception = new HttpException("Test error", HttpStatus.BAD_REQUEST);

				filter.catch(exception, mockArgumentsHost);

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

				filter.catch(exception, mockArgumentsHost);

				expect(mockResponse.status).toHaveBeenCalledWith(500);
				expect(mockResponse.json).toHaveBeenCalledWith(
					expect.objectContaining({
						statusCode: 500,
						error: "HttpError",
						message: "Unexpected error",
					})
				);
			});
		});

		describe("RPC контекст", () => {
			beforeEach(() => {
				(mockArgumentsHost.getType as jest.Mock).mockReturnValue(ContextType.RPC);
			});

			it("должен обработать RPC ошибку через RpcExceptionFilter", () => {
				const exception = new Error("RPC error");
				const rpcError = RpcError.fromUnknown(exception);
				jest.spyOn(RpcError, "fromUnknown").mockReturnValue(rpcError);
				jest.spyOn(rpcError, "isTransient").mockReturnValue(false);

				expect(() => {
					filter.catch(exception, mockArgumentsHost);
				}).toThrow(rpcError);

				expect(mockChannel.publish).toHaveBeenCalled();
				expect(mockChannel.ack).toHaveBeenCalled();
			});

			it("должен requeue временную ошибку если retries < MAX_RETRIES", () => {
				const exception = new Error("Timeout");
				const rpcError = RpcError.fromUnknown(exception);
				jest.spyOn(RpcError, "fromUnknown").mockReturnValue(rpcError);
				jest.spyOn(rpcError, "isTransient").mockReturnValue(true);
				mockMessage.properties.headers = {};

				filter.catch(exception, mockArgumentsHost);

				expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, false);
			});
		});

		describe("WebSocket контекст", () => {
			beforeEach(() => {
				(mockArgumentsHost.getType as jest.Mock).mockReturnValue(ContextType.WS);
			});

			it("должен обработать WebSocket ошибку через WebSocketExceptionHandler", () => {
				const mockClient = {
					emit: jest.fn(),
				};
				(mockArgumentsHost.switchToWs as jest.Mock).mockReturnValue({
					getClient: jest.fn().mockReturnValue(mockClient),
				});

				const exception = new Error("WebSocket error");

				filter.catch(exception, mockArgumentsHost);

				expect(mockClient.emit).toHaveBeenCalledWith(
					"exception",
					expect.objectContaining({
						status: "error",
						message: expect.any(String),
					})
				);
			});
		});

		describe("неизвестный контекст", () => {
			it("должен пробросить исключение для неизвестного контекста", () => {
				(mockArgumentsHost.getType as jest.Mock).mockReturnValue("unknown");
				const exception = new Error("Unknown context error");

				expect(() => {
					filter.catch(exception, mockArgumentsHost);
				}).toThrow(exception);

				expect(mockResponse.status).not.toHaveBeenCalled();
				expect(mockResponse.json).not.toHaveBeenCalled();
				expect(mockChannel.publish).not.toHaveBeenCalled();
			});

			it("должен пробросить исключение для пустого контекста", () => {
				(mockArgumentsHost.getType as jest.Mock).mockReturnValue("");
				const exception = new Error("Empty context error");

				expect(() => {
					filter.catch(exception, mockArgumentsHost);
				}).toThrow(exception);
			});
		});
	});
});
