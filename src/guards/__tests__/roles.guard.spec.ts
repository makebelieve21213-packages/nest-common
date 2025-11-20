import { ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import RolesGuard from "src/guards/roles.guard";

import type { ExecutionContext } from "@nestjs/common";

describe("RolesGuard", () => {
	let guard: RolesGuard;
	let reflector: Reflector;
	let mockExecutionContext: jest.Mocked<ExecutionContext>;
	let mockRequest: { user?: { roles?: string[] } };

	beforeEach(() => {
		reflector = new Reflector();
		guard = new RolesGuard(reflector);

		mockRequest = {};

		mockExecutionContext = {
			getHandler: jest.fn(),
			getClass: jest.fn(),
			switchToHttp: jest.fn().mockReturnValue({
				getRequest: jest.fn().mockReturnValue(mockRequest),
			}),
		} as unknown as jest.Mocked<ExecutionContext>;
	});

	it("should allow access when no roles are required", () => {
		jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(undefined);

		const result = guard.canActivate(mockExecutionContext);

		expect(result).toBe(true);
	});

	it("should allow access when user has required role", () => {
		jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(["admin"]);
		mockRequest.user = { roles: ["admin", "user"] };

		const result = guard.canActivate(mockExecutionContext);

		expect(result).toBe(true);
	});

	it("should allow access when user has one of required roles", () => {
		jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(["admin", "moderator"]);
		mockRequest.user = { roles: ["moderator"] };

		const result = guard.canActivate(mockExecutionContext);

		expect(result).toBe(true);
	});

	it("should throw ForbiddenException when user does not have required role", () => {
		jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(["admin"]);
		mockRequest.user = { roles: ["user"] };

		expect(() => guard.canActivate(mockExecutionContext)).toThrow(ForbiddenException);
		expect(() => guard.canActivate(mockExecutionContext)).toThrow("Insufficient permissions");
	});

	it("should throw ForbiddenException when user is not authenticated", () => {
		jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(["admin"]);
		mockRequest.user = undefined;

		expect(() => guard.canActivate(mockExecutionContext)).toThrow(ForbiddenException);
		expect(() => guard.canActivate(mockExecutionContext)).toThrow("User not authenticated");
	});

	it("should handle empty roles array", () => {
		jest.spyOn(reflector, "getAllAndOverride").mockReturnValue([]);

		const result = guard.canActivate(mockExecutionContext);

		expect(result).toBe(true);
	});

	it("should handle user with undefined roles", () => {
		jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(["admin"]);
		mockRequest.user = { roles: undefined };

		expect(() => guard.canActivate(mockExecutionContext)).toThrow(ForbiddenException);
	});

	it("должен покрыть строку 13 - параметр reflector конструктора", () => {
		// Покрываем строку 13 - параметр reflector конструктора
		const testReflector = new Reflector();
		const testGuard = new RolesGuard(testReflector);
		expect(testGuard).toBeInstanceOf(RolesGuard);
		jest.spyOn(testReflector, "getAllAndOverride").mockReturnValue(undefined);
		const result = testGuard.canActivate(mockExecutionContext);
		expect(result).toBe(true);
	});

	it("должен покрыть все ветки конструктора", () => {
		const testReflector = new Reflector();
		const testGuard = new RolesGuard(testReflector);
		expect(testGuard).toBeInstanceOf(RolesGuard);
		// Вызываем canActivate для покрытия всех веток
		jest.spyOn(testReflector, "getAllAndOverride").mockReturnValue([]);
		const result1 = testGuard.canActivate(mockExecutionContext);
		expect(result1).toBe(true);

		jest.spyOn(testReflector, "getAllAndOverride").mockReturnValue(["admin"]);
		mockRequest.user = { roles: ["admin"] };
		const result2 = testGuard.canActivate(mockExecutionContext);
		expect(result2).toBe(true);
	});
});
