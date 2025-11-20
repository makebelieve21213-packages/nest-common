import { of } from "rxjs";
import ResponseInterceptor from "src/interceptors/response.interceptor";

import type { ExecutionContext, CallHandler } from "@nestjs/common";
import type { StandardResponse } from "src/types/http-response";

describe("ResponseInterceptor", () => {
	let interceptor: ResponseInterceptor<unknown>;
	let mockExecutionContext: jest.Mocked<ExecutionContext>;
	let mockCallHandler: jest.Mocked<CallHandler>;
	let mockRequest: {
		url?: string;
		path?: string;
		headers: Record<string, string>;
		id?: string;
	};

	beforeEach(() => {
		interceptor = new ResponseInterceptor();

		mockRequest = {
			url: "/test",
			path: "/test",
			headers: {
				"x-request-id": "test-request-id",
			},
			id: "request-id",
		};

		mockExecutionContext = {
			switchToHttp: jest.fn().mockReturnValue({
				getRequest: jest.fn().mockReturnValue(mockRequest),
			}),
		} as unknown as jest.Mocked<ExecutionContext>;

		mockCallHandler = {
			handle: jest.fn().mockReturnValue(of({ test: "data" })),
		} as unknown as jest.Mocked<CallHandler>;
	});

	it("should wrap response in standard format", (done) => {
		interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((response) => {
			expect(response).toEqual({
				success: true,
				data: { test: "data" },
				meta: {
					timestamp: expect.any(String),
					path: "/test",
					requestId: "test-request-id",
				},
			});
			done();
		});
	});

	it("should preserve standard format if already present", (done) => {
		const standardResponse: StandardResponse = {
			success: true,
			data: { test: "data" },
			meta: {
				timestamp: "2024-01-01T00:00:00.000Z",
			},
		};

		mockCallHandler.handle = jest.fn().mockReturnValue(of(standardResponse));

		interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((response) => {
			expect(response).toEqual(standardResponse);
			done();
		});
	});

	it("should handle array data", (done) => {
		mockCallHandler.handle = jest.fn().mockReturnValue(of([1, 2, 3]));

		interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((response) => {
			expect(response).toEqual({
				success: true,
				data: [1, 2, 3],
				meta: {
					timestamp: expect.any(String),
					path: "/test",
					requestId: "test-request-id",
				},
			});
			done();
		});
	});

	it("should use request.id when x-request-id is not present", (done) => {
		mockRequest.headers = {};
		mockRequest.id = "fallback-id";

		interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((response) => {
			expect(response.meta?.requestId).toBe("fallback-id");
			done();
		});
	});

	it("should use request.path when request.url is not available", (done) => {
		mockRequest.url = undefined;
		mockRequest.path = "/alternative-path";

		interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((response) => {
			expect(response.meta?.path).toBe("/alternative-path");
			done();
		});
	});

	it("should use undefined requestId when both headers and id are not available", (done) => {
		mockRequest.headers = {};
		mockRequest.id = undefined;

		interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((response) => {
			expect(response.meta?.requestId).toBeUndefined();
			done();
		});
	});
});
