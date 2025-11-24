import { WsException } from "@nestjs/websockets";
import { createLoggerServiceMock } from "src/__tests__/mocks/logger-service.mock";
import SocketError from "src/errors/socket.error";
import WebSocketExceptionHandler from "src/filters/websocket-exception-handler";

import type { LoggerService } from "@makebelieve21213-packages/logger";
import type { ArgumentsHost } from "@nestjs/common";

describe("WebSocketExceptionHandler", () => {
	let handler: WebSocketExceptionHandler;
	let mockLoggerService: jest.Mocked<LoggerService>;
	let mockArgumentsHost: jest.Mocked<ArgumentsHost>;
	let mockClient: {
		emit: jest.Mock;
		id: string;
	};

	beforeEach(() => {
		mockLoggerService = createLoggerServiceMock();

		mockClient = {
			emit: jest.fn(),
			id: "test-client-id",
		};

		mockArgumentsHost = {
			switchToWs: jest.fn().mockReturnValue({
				getClient: jest.fn().mockReturnValue(mockClient),
				getData: jest.fn().mockReturnValue({ test: "data" }),
			}),
		} as unknown as jest.Mocked<ArgumentsHost>;

		handler = new WebSocketExceptionHandler(mockLoggerService);
	});

	it("should handle SocketError", () => {
		const error = new SocketError("Socket error");

		handler.handleException(error, mockArgumentsHost);

		expect(mockLoggerService.setContext).toHaveBeenCalledWith(WebSocketExceptionHandler.name);
		expect(mockLoggerService.error).toHaveBeenCalled();
		expect(mockClient.emit).toHaveBeenCalledWith("exception", {
			status: "error",
			message: "Socket error",
			code: "SOCKET_ERROR",
			timestamp: expect.any(String),
		});
	});

	it("should handle WsException", () => {
		const error = new WsException("WebSocket error");

		handler.handleException(error, mockArgumentsHost);

		expect(mockLoggerService.error).toHaveBeenCalled();
		expect(mockClient.emit).toHaveBeenCalledWith("exception", {
			status: "error",
			message: "WebSocket error",
			code: "WS_EXCEPTION",
			timestamp: expect.any(String),
		});
	});

	it("should handle generic Error", () => {
		const error = new Error("Generic error");

		handler.handleException(error, mockArgumentsHost);

		expect(mockLoggerService.error).toHaveBeenCalled();
		expect(mockClient.emit).toHaveBeenCalledWith("exception", {
			status: "error",
			message: "Generic error",
			code: "ERROR",
			timestamp: expect.any(String),
		});
	});

	it("should handle unknown error", () => {
		const error = "Unknown error string";

		handler.handleException(error, mockArgumentsHost);

		expect(mockLoggerService.error).toHaveBeenCalled();
		expect(mockClient.emit).toHaveBeenCalledWith("exception", {
			status: "error",
			message: "Unknown error string",
			code: "INTERNAL_ERROR",
			timestamp: expect.any(String),
		});
	});

	it("should log stack trace when available", () => {
		const error = new Error("Error with stack");
		error.stack = "Error: Error with stack\n    at test.js:1:1";

		handler.handleException(error, mockArgumentsHost);

		expect(mockLoggerService.error).toHaveBeenCalledTimes(2);
		expect(mockLoggerService.error).toHaveBeenCalledWith(expect.stringContaining("Error with stack"));
		expect(mockLoggerService.error).toHaveBeenCalledWith(
			"Stack trace: Error: Error with stack\n    at test.js:1:1"
		);
	});
});
