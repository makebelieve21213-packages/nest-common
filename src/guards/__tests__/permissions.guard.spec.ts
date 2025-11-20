import { ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import PermissionsGuard from "src/guards/permissions.guard";

import type { ExecutionContext } from "@nestjs/common";

describe("PermissionsGuard", () => {
	let guard: PermissionsGuard;
	let reflector: Reflector;
	let mockExecutionContext: jest.Mocked<ExecutionContext>;
	let mockRequest: { user?: { permissions?: string[] } };

	beforeEach(() => {
		reflector = new Reflector();
		guard = new PermissionsGuard(reflector);

		mockRequest = {};

		mockExecutionContext = {
			getHandler: jest.fn(),
			getClass: jest.fn(),
			switchToHttp: jest.fn().mockReturnValue({
				getRequest: jest.fn().mockReturnValue(mockRequest),
			}),
		} as unknown as jest.Mocked<ExecutionContext>;
	});

	it("should allow access when no permissions are required", () => {
		jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(undefined);

		const result = guard.canActivate(mockExecutionContext);

		expect(result).toBe(true);
	});

	it("should allow access when user has all required permissions", () => {
		jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(["read", "write"]);
		mockRequest.user = { permissions: ["read", "write", "delete"] };

		const result = guard.canActivate(mockExecutionContext);

		expect(result).toBe(true);
	});

	it("should throw ForbiddenException when user does not have all required permissions", () => {
		jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(["read", "write"]);
		mockRequest.user = { permissions: ["read"] };

		expect(() => guard.canActivate(mockExecutionContext)).toThrow(ForbiddenException);
		expect(() => guard.canActivate(mockExecutionContext)).toThrow("Insufficient permissions");
	});

	it("should throw ForbiddenException when user is not authenticated", () => {
		jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(["read"]);
		mockRequest.user = undefined;

		expect(() => guard.canActivate(mockExecutionContext)).toThrow(ForbiddenException);
		expect(() => guard.canActivate(mockExecutionContext)).toThrow("User not authenticated");
	});

	it("should handle empty permissions array", () => {
		jest.spyOn(reflector, "getAllAndOverride").mockReturnValue([]);

		const result = guard.canActivate(mockExecutionContext);

		expect(result).toBe(true);
	});

	it("should handle user with undefined permissions", () => {
		jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(["read"]);
		mockRequest.user = { permissions: undefined };

		expect(() => guard.canActivate(mockExecutionContext)).toThrow(ForbiddenException);
	});

	it("должен покрыть строку 13 - параметр reflector конструктора", () => {
		// Покрываем строку 13 - параметр reflector конструктора
		const testReflector = new Reflector();
		const testGuard = new PermissionsGuard(testReflector);
		expect(testGuard).toBeInstanceOf(PermissionsGuard);
		jest.spyOn(testReflector, "getAllAndOverride").mockReturnValue(undefined);
		const result = testGuard.canActivate(mockExecutionContext);
		expect(result).toBe(true);
	});

	it("должен покрыть все ветки конструктора", () => {
		const testReflector = new Reflector();
		const testGuard = new PermissionsGuard(testReflector);
		expect(testGuard).toBeInstanceOf(PermissionsGuard);
		// Вызываем canActivate для покрытия всех веток
		jest.spyOn(testReflector, "getAllAndOverride").mockReturnValue([]);
		const result1 = testGuard.canActivate(mockExecutionContext);
		expect(result1).toBe(true);

		jest.spyOn(testReflector, "getAllAndOverride").mockReturnValue(["read"]);
		mockRequest.user = { permissions: ["read"] };
		const result2 = testGuard.canActivate(mockExecutionContext);
		expect(result2).toBe(true);
	});
});
