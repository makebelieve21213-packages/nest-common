import { UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import ApiKeyGuard from "src/guards/api-key.guard";

import type { ExecutionContext } from "@nestjs/common";

describe("ApiKeyGuard", () => {
	let guard: ApiKeyGuard;
	let reflector: Reflector;
	let mockExecutionContext: jest.Mocked<ExecutionContext>;
	let mockRequest: { headers: Record<string, string> };

	beforeEach(() => {
		reflector = new Reflector();
		mockRequest = {
			headers: {},
		};

		mockExecutionContext = {
			getHandler: jest.fn(),
			getClass: jest.fn(),
			switchToHttp: jest.fn().mockReturnValue({
				getRequest: jest.fn().mockReturnValue(mockRequest),
			}),
		} as unknown as jest.Mocked<ExecutionContext>;
	});

	it("should allow access for public endpoints", () => {
		jest
			.spyOn(reflector, "getAllAndOverride")
			.mockReturnValueOnce(true) // IS_PUBLIC_KEY
			.mockReturnValueOnce(false); // API_KEY_KEY

		guard = new ApiKeyGuard(reflector);

		const result = guard.canActivate(mockExecutionContext);

		expect(result).toBe(true);
	});

	it("should allow access when API key is not required", () => {
		jest
			.spyOn(reflector, "getAllAndOverride")
			.mockReturnValueOnce(false) // IS_PUBLIC_KEY
			.mockReturnValueOnce(false); // API_KEY_KEY

		guard = new ApiKeyGuard(reflector);

		const result = guard.canActivate(mockExecutionContext);

		expect(result).toBe(true);
	});

	it("should allow access when valid API key is provided", () => {
		jest
			.spyOn(reflector, "getAllAndOverride")
			.mockReturnValueOnce(false) // IS_PUBLIC_KEY
			.mockReturnValueOnce(true); // API_KEY_KEY

		mockRequest.headers["x-api-key"] = "valid-key";
		guard = new ApiKeyGuard(reflector);

		const result = guard.canActivate(mockExecutionContext);

		expect(result).toBe(true);
	});

	it("should throw UnauthorizedException when API key is required but not provided", () => {
		jest
			.spyOn(reflector, "getAllAndOverride")
			.mockReturnValueOnce(false) // IS_PUBLIC_KEY
			.mockReturnValueOnce(true); // API_KEY_KEY

		guard = new ApiKeyGuard(reflector);

		let thrownError: Error | undefined;
		try {
			guard.canActivate(mockExecutionContext);
		} catch (error) {
			thrownError = error as Error;
		}

		expect(thrownError).toBeInstanceOf(UnauthorizedException);
		expect(thrownError?.message).toBe("API key is required");
	});

	it("should throw UnauthorizedException when API key is invalid", () => {
		jest
			.spyOn(reflector, "getAllAndOverride")
			.mockReturnValueOnce(false) // IS_PUBLIC_KEY
			.mockReturnValueOnce(true); // API_KEY_KEY

		const validKeys = new Set(["valid-key-1", "valid-key-2"]);
		mockRequest.headers["x-api-key"] = "invalid-key";
		guard = new ApiKeyGuard(reflector, "x-api-key", validKeys);

		let thrownError: Error | undefined;
		try {
			guard.canActivate(mockExecutionContext);
		} catch (error) {
			thrownError = error as Error;
		}

		expect(thrownError).toBeInstanceOf(UnauthorizedException);
		expect(thrownError?.message).toBe("Invalid API key");
	});

	it("should use custom header name", () => {
		jest
			.spyOn(reflector, "getAllAndOverride")
			.mockReturnValueOnce(false) // IS_PUBLIC_KEY
			.mockReturnValueOnce(true); // API_KEY_KEY

		mockRequest.headers["custom-header"] = "valid-key";
		guard = new ApiKeyGuard(reflector, "custom-header");

		const result = guard.canActivate(mockExecutionContext);

		expect(result).toBe(true);
	});

	it("должен покрыть строку 15 - параметр reflector конструктора", () => {
		// Покрываем строку 15 - параметр reflector конструктора
		const testReflector = new Reflector();
		const testGuard = new ApiKeyGuard(testReflector);
		expect(testGuard).toBeInstanceOf(ApiKeyGuard);
		jest
			.spyOn(testReflector, "getAllAndOverride")
			.mockReturnValueOnce(false) // IS_PUBLIC_KEY
			.mockReturnValueOnce(false); // API_KEY_KEY
		const result = testGuard.canActivate(mockExecutionContext);
		expect(result).toBe(true);
	});

	it("должен покрыть все ветки конструктора с разными комбинациями параметров", () => {
		const testReflector = new Reflector();

		// Тест 1: только reflector
		const guard1 = new ApiKeyGuard(testReflector);
		expect(guard1).toBeInstanceOf(ApiKeyGuard);

		// Тест 2: reflector + apiKeyHeader
		const guard2 = new ApiKeyGuard(testReflector, "custom-header");
		expect(guard2).toBeInstanceOf(ApiKeyGuard);

		// Тест 3: reflector + apiKeyHeader + validApiKeys
		const validKeys = new Set(["key1", "key2"]);
		const guard3 = new ApiKeyGuard(testReflector, "custom-header", validKeys);
		expect(guard3).toBeInstanceOf(ApiKeyGuard);

		// Тест 4: reflector + undefined apiKeyHeader + validApiKeys
		const guard4 = new ApiKeyGuard(testReflector, undefined, validKeys);
		expect(guard4).toBeInstanceOf(ApiKeyGuard);
	});
});
