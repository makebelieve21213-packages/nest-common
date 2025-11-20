import { of } from "rxjs";
import RequestIdResponseInterceptor from "src/interceptors/request-id-response.interceptor";
import { getRequestIdFromContext } from "src/utils/context.utils";

import type { ExecutionContext, CallHandler } from "@nestjs/common";

jest.mock("src/utils/context.utils");

describe("RequestIdResponseInterceptor", () => {
	let interceptor: RequestIdResponseInterceptor;
	let mockExecutionContext: jest.Mocked<ExecutionContext>;
	let mockCallHandler: jest.Mocked<CallHandler>;
	let mockResponse: {
		setHeader: jest.Mock;
	};

	beforeEach(() => {
		mockResponse = {
			setHeader: jest.fn(),
		};

		mockExecutionContext = {
			switchToHttp: jest.fn().mockReturnValue({
				getResponse: jest.fn().mockReturnValue(mockResponse),
			}),
		} as unknown as jest.Mocked<ExecutionContext>;

		mockCallHandler = {
			handle: jest.fn().mockReturnValue(of({ test: "data" })),
		} as unknown as jest.Mocked<CallHandler>;

		interceptor = new RequestIdResponseInterceptor();
	});

	it("should add Request ID to response headers", (done) => {
		(getRequestIdFromContext as jest.Mock).mockReturnValue("test-request-id");

		interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
			expect(mockResponse.setHeader).toHaveBeenCalledWith("X-Request-ID", "test-request-id");
			done();
		});
	});

	it("should not add Request ID when it is unknown", (done) => {
		(getRequestIdFromContext as jest.Mock).mockReturnValue("unknown");

		interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
			expect(mockResponse.setHeader).not.toHaveBeenCalled();
			done();
		});
	});
});
