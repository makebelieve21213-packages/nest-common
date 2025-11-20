import { WsException } from "@nestjs/websockets";
import WebSocketAuthGuard from "src/guards/websocket-auth.guard";

import type { ExecutionContext } from "@nestjs/common";
import type { TokenValidator } from "src/guards/websocket-auth.guard";

describe("WebSocketAuthGuard", () => {
	let guard: WebSocketAuthGuard;
	let mockExecutionContext: jest.Mocked<ExecutionContext>;
	let mockClient: {
		handshake?: {
			auth?: {
				token?: string;
			};
		};
	};
	let mockData: { token?: string };

	beforeEach(() => {
		mockClient = {
			handshake: {
				auth: {},
			},
		};

		mockData = {};

		mockExecutionContext = {
			switchToWs: jest.fn().mockReturnValue({
				getClient: jest.fn().mockReturnValue(mockClient),
				getData: jest.fn().mockReturnValue(mockData),
			}),
		} as unknown as jest.Mocked<ExecutionContext>;
	});

	it("should allow access when token is provided in data without validator", async () => {
		guard = new WebSocketAuthGuard();
		mockData.token = "valid-token";

		const result = await guard.canActivate(mockExecutionContext);

		expect(result).toBe(true);
	});

	it("should allow access when token is provided in handshake.auth without validator", async () => {
		guard = new WebSocketAuthGuard();
		mockClient.handshake = {
			auth: {
				token: "valid-token",
			},
		};

		const result = await guard.canActivate(mockExecutionContext);

		expect(result).toBe(true);
	});

	it("should throw WsException when token is not provided", async () => {
		guard = new WebSocketAuthGuard();
		mockData.token = undefined;
		mockClient.handshake = {
			auth: {},
		};

		await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(WsException);
		await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
			"Authentication token is required"
		);
	});

	it("should call token validator when provided", async () => {
		const tokenValidator: TokenValidator = jest.fn().mockResolvedValue(true);
		guard = new WebSocketAuthGuard(tokenValidator);
		mockData.token = "valid-token";

		const result = await guard.canActivate(mockExecutionContext);

		expect(result).toBe(true);
		expect(tokenValidator).toHaveBeenCalledWith("valid-token", mockExecutionContext);
	});

	it("should throw WsException when token validator returns false", async () => {
		const tokenValidator: TokenValidator = jest.fn().mockResolvedValue(false);
		guard = new WebSocketAuthGuard(tokenValidator);
		mockData.token = "invalid-token";

		await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(WsException);
		await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
			"Invalid authentication token"
		);
		expect(tokenValidator).toHaveBeenCalledWith("invalid-token", mockExecutionContext);
	});

	it("should handle synchronous token validator", async () => {
		const tokenValidator: TokenValidator = jest.fn().mockReturnValue(true);
		guard = new WebSocketAuthGuard(tokenValidator);
		mockData.token = "valid-token";

		const result = await guard.canActivate(mockExecutionContext);

		expect(result).toBe(true);
		expect(tokenValidator).toHaveBeenCalledWith("valid-token", mockExecutionContext);
	});
});
