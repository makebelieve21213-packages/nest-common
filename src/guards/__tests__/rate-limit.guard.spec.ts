import { HttpException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import RateLimitGuard from "src/guards/rate-limit.guard";

import type { ExecutionContext } from "@nestjs/common";

describe("RateLimitGuard", () => {
	let guard: RateLimitGuard;
	let reflector: Reflector;
	let mockExecutionContext: jest.Mocked<ExecutionContext>;
	let mockRequest: {
		url?: string;
		path?: string;
		headers?: Record<string, string>;
		ip?: string;
		socket?: {
			remoteAddress?: string;
		};
	};

	beforeEach(() => {
		reflector = new Reflector();
		mockRequest = {
			url: "/test",
			path: "/test",
			headers: {},
			ip: "127.0.0.1",
			socket: {
				remoteAddress: "127.0.0.1",
			},
		};

		mockExecutionContext = {
			getHandler: jest.fn(),
			getClass: jest.fn(),
			switchToHttp: jest.fn().mockReturnValue({
				getRequest: jest.fn().mockReturnValue(mockRequest),
			}),
		} as unknown as jest.Mocked<ExecutionContext>;

		// Используем короткое окно для тестов
		guard = new RateLimitGuard(reflector, 5, 1000);
	});

	it("should allow request when limit is not exceeded", () => {
		jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(false);

		for (let i = 0; i < 5; i++) {
			const result = guard.canActivate(mockExecutionContext);
			expect(result).toBe(true);
		}
	});

	it("should throw TooManyRequestsException when limit is exceeded", () => {
		jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(false);

		// Делаем максимальное количество запросов
		for (let i = 0; i < 5; i++) {
			guard.canActivate(mockExecutionContext);
		}

		// Следующий запрос должен быть отклонен
		expect(() => guard.canActivate(mockExecutionContext)).toThrow(HttpException);
		expect(() => guard.canActivate(mockExecutionContext)).toThrow("Too many requests");
	});

	it("should apply stricter limits for public endpoints", () => {
		jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(true);

		// Для публичных эндпоинтов лимит должен быть в 2 раза меньше (5/2 = 2.5)
		// Первый запрос создает запись с count = 1
		const result1 = guard.canActivate(mockExecutionContext);
		expect(result1).toBe(true);

		// Второй запрос увеличивает count до 2 (2 < 2.5, проходит)
		const result2 = guard.canActivate(mockExecutionContext);
		expect(result2).toBe(true);

		// Третий запрос проверяет count = 2 >= 2.5 (не выполняется), затем увеличивает до 3
		// Четвертый запрос проверяет count = 3 >= 2.5 (выполняется), выбрасывает исключение
		guard.canActivate(mockExecutionContext); // count становится 3
		expect(() => guard.canActivate(mockExecutionContext)).toThrow(HttpException);
		expect(() => guard.canActivate(mockExecutionContext)).toThrow("Too many requests");
	});

	it("should reset limit after window expires", async () => {
		jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(false);

		// Используем очень короткое окно для теста
		const shortWindowGuard = new RateLimitGuard(reflector, 2, 100);

		// Делаем максимальное количество запросов
		shortWindowGuard.canActivate(mockExecutionContext);
		shortWindowGuard.canActivate(mockExecutionContext);

		// Ждем истечения окна
		await new Promise((resolve) => setTimeout(resolve, 150));

		// После истечения окна запрос должен быть разрешен
		const result = shortWindowGuard.canActivate(mockExecutionContext);
		expect(result).toBe(true);
	});

	it("should use custom key generator when provided", () => {
		const customKeyGenerator = jest.fn().mockReturnValue("custom-key");
		const customGuard = new RateLimitGuard(reflector, 5, 1000, customKeyGenerator);

		jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(false);

		customGuard.canActivate(mockExecutionContext);

		expect(customKeyGenerator).toHaveBeenCalledWith(mockExecutionContext);
	});

	it("should use default maxRequests and windowMs when not provided", () => {
		const guardWithDefaults = new RateLimitGuard(reflector);
		jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(false);

		// Должен работать с дефолтными значениями (100 запросов в минуту)
		const result = guardWithDefaults.canActivate(mockExecutionContext);
		expect(result).toBe(true);
	});

	it("should use request.path when request.url is not available", () => {
		mockRequest.url = undefined;
		mockRequest.path = "/alternative-path";
		jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(false);

		guard.canActivate(mockExecutionContext);

		// Проверяем, что guard работает с path вместо url
		const result = guard.canActivate(mockExecutionContext);
		expect(result).toBe(true);
	});

	it("should use empty string when both url and path are not available", () => {
		mockRequest.url = undefined;
		mockRequest.path = undefined;
		jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(false);

		guard.canActivate(mockExecutionContext);

		// Проверяем, что guard работает даже без url и path
		const result = guard.canActivate(mockExecutionContext);
		expect(result).toBe(true);
	});

	it("должен покрыть строку 20 - параметр reflector конструктора", () => {
		// Покрываем строку 20 - параметр reflector конструктора
		const testReflector = new Reflector();
		const testGuard = new RateLimitGuard(testReflector);
		expect(testGuard).toBeInstanceOf(RateLimitGuard);
		jest.spyOn(testReflector, "getAllAndOverride").mockReturnValue(false);
		const result = testGuard.canActivate(mockExecutionContext);
		expect(result).toBe(true);
	});
});
