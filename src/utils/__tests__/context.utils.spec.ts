import {
	getUserFromContext,
	getIpFromContext,
	getUserAgentFromContext,
	getRequestIdFromContext,
} from "src/utils/context.utils";

import type { ExecutionContext } from "@nestjs/common";
import type { Socket } from "net";
import type { ExtendedRequest } from "src/types/context-types";

describe("context.utils", () => {
	let mockExecutionContext: jest.Mocked<ExecutionContext>;
	let mockRequest: Partial<ExtendedRequest>;
	let mockSocket: Partial<Socket>;

	beforeEach(() => {
		mockSocket = {
			remoteAddress: "192.168.1.1",
		} as Partial<Socket>;

		mockRequest = {
			user: { id: 1, email: "test@test.com" },
			ip: "127.0.0.1",
			id: "test-request-id",
			headers: {
				"user-agent": "test-agent",
				"x-request-id": "test-request-id",
			},
			socket: mockSocket as Socket,
		};

		mockExecutionContext = {
			switchToHttp: jest.fn().mockReturnValue({
				getRequest: jest.fn().mockReturnValue(mockRequest),
			}),
		} as unknown as jest.Mocked<ExecutionContext>;
	});

	describe("getUserFromContext", () => {
		it("should return user from request", () => {
			const user = getUserFromContext(mockExecutionContext);

			expect(user).toEqual({ id: 1, email: "test@test.com" });
		});

		it("should return undefined when user is not present", () => {
			mockRequest.user = undefined;

			const user = getUserFromContext(mockExecutionContext);

			expect(user).toBeUndefined();
		});
	});

	describe("getIpFromContext", () => {
		it("should return IP from x-forwarded-for header", () => {
			mockRequest.headers = {
				"x-forwarded-for": "192.168.1.1, 10.0.0.1",
			};

			const ip = getIpFromContext(mockExecutionContext);

			expect(ip).toBe("192.168.1.1");
		});

		it("should return IP from request.ip", () => {
			mockRequest.headers = {};
			Object.defineProperty(mockRequest, "ip", {
				value: "127.0.0.1",
				writable: true,
				configurable: true,
			});

			const ip = getIpFromContext(mockExecutionContext);

			expect(ip).toBe("127.0.0.1");
		});

		it("should return IP from socket.remoteAddress", () => {
			mockRequest.headers = {};
			Object.defineProperty(mockRequest, "ip", {
				value: undefined,
				writable: true,
				configurable: true,
			});
			mockRequest.socket = {
				remoteAddress: "192.168.1.1",
			} as Socket;

			const ip = getIpFromContext(mockExecutionContext);

			expect(ip).toBe("192.168.1.1");
		});

		it("should return 'unknown' when IP is not available", () => {
			mockRequest.headers = {};
			Object.defineProperty(mockRequest, "ip", {
				value: undefined,
				writable: true,
				configurable: true,
			});
			mockRequest.socket = {
				remoteAddress: undefined,
			} as Socket;

			const ip = getIpFromContext(mockExecutionContext);

			expect(ip).toBe("unknown");
		});
	});

	describe("getUserAgentFromContext", () => {
		it("should return user-agent from headers", () => {
			const userAgent = getUserAgentFromContext(mockExecutionContext);

			expect(userAgent).toBe("test-agent");
		});

		it("should return 'unknown' when user-agent is not present", () => {
			mockRequest.headers = {};

			const userAgent = getUserAgentFromContext(mockExecutionContext);

			expect(userAgent).toBe("unknown");
		});
	});

	describe("getRequestIdFromContext", () => {
		it("should return request ID from x-request-id header", () => {
			const requestId = getRequestIdFromContext(mockExecutionContext);

			expect(requestId).toBe("test-request-id");
		});

		it("should return request ID from request.id", () => {
			mockRequest.headers = {};
			mockRequest.id = "request-id-from-request";

			const requestId = getRequestIdFromContext(mockExecutionContext);

			expect(requestId).toBe("request-id-from-request");
		});

		it("should return 'unknown' when request ID is not present", () => {
			mockRequest.headers = {};
			mockRequest.id = undefined;

			const requestId = getRequestIdFromContext(mockExecutionContext);

			expect(requestId).toBe("unknown");
		});
	});
});
