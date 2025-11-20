import { UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import JwtAuthGuard from "src/guards/jwt-auth.guard";

import type { ExecutionContext } from "@nestjs/common";

describe("JwtAuthGuard", () => {
	let guard: JwtAuthGuard;
	let reflector: Reflector;
	let mockExecutionContext: jest.Mocked<ExecutionContext>;
	let mockRequest: { user?: unknown };

	beforeEach(() => {
		reflector = new Reflector();
		guard = new JwtAuthGuard(reflector);

		mockRequest = {};

		mockExecutionContext = {
			getHandler: jest.fn(),
			getClass: jest.fn(),
			switchToHttp: jest.fn().mockReturnValue({
				getRequest: jest.fn().mockReturnValue(mockRequest),
			}),
		} as unknown as jest.Mocked<ExecutionContext>;
	});

	it("should allow access for public endpoints", () => {
		jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(true);

		const result = guard.canActivate(mockExecutionContext);

		expect(result).toBe(true);
	});

	it("should allow access when user is authenticated", () => {
		jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(false);
		mockRequest.user = { id: 1, email: "test@test.com" };

		const result = guard.canActivate(mockExecutionContext);

		expect(result).toBe(true);
	});

	it("should throw UnauthorizedException when user is not authenticated", () => {
		jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(false);
		mockRequest.user = undefined;

		expect(() => guard.canActivate(mockExecutionContext)).toThrow(UnauthorizedException);
		expect(() => guard.canActivate(mockExecutionContext)).toThrow("User not authenticated");
	});

	it("должен покрыть строку 13 - параметр reflector конструктора", () => {
		// Покрываем строку 13 - параметр reflector конструктора
		const testReflector = new Reflector();
		const testGuard = new JwtAuthGuard(testReflector);
		expect(testGuard).toBeInstanceOf(JwtAuthGuard);
		jest.spyOn(testReflector, "getAllAndOverride").mockReturnValue(true);
		const result = testGuard.canActivate(mockExecutionContext);
		expect(result).toBe(true);
	});

	it("должен покрыть все ветки конструктора", () => {
		const testReflector = new Reflector();
		const testGuard = new JwtAuthGuard(testReflector);
		expect(testGuard).toBeInstanceOf(JwtAuthGuard);
		// Вызываем canActivate для покрытия всех веток
		jest.spyOn(testReflector, "getAllAndOverride").mockReturnValue(false);
		mockRequest.user = { id: 1 };
		const result1 = testGuard.canActivate(mockExecutionContext);
		expect(result1).toBe(true);

		jest.spyOn(testReflector, "getAllAndOverride").mockReturnValue(true);
		const result2 = testGuard.canActivate(mockExecutionContext);
		expect(result2).toBe(true);
	});
});
