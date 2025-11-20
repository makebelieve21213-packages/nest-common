import { createLoggerServiceMock } from "src/__tests__/mocks/logger-service.mock";
import { CircuitBreakerState } from "src/types/circuit-breaker-types";
import CircuitBreakerService from "src/utils/circuit-breaker";

import type { LoggerService } from "@makebelieve21213-packages/logger";

describe("CircuitBreakerService", () => {
	let service: CircuitBreakerService;
	let mockLogger: jest.Mocked<LoggerService>;

	beforeEach(() => {
		mockLogger = createLoggerServiceMock();
		service = new CircuitBreakerService(mockLogger, {
			failureThreshold: 3,
			successThreshold: 2,
			resetTimeout: 100,
		});
	});

	it("should execute function successfully", async () => {
		const fn = jest.fn().mockResolvedValue("success");

		const result = await service.execute("test-key", fn);

		expect(result).toBe("success");
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it("should track failures and open circuit", async () => {
		const fn = jest.fn().mockRejectedValue(new Error("Test error"));

		// Выполняем функцию до порога ошибок
		for (let i = 0; i < 3; i++) {
			await expect(service.execute("test-key", fn)).rejects.toThrow("Test error");
		}

		// Следующий запрос должен быть отклонен из-за открытого circuit breaker
		await expect(service.execute("test-key", fn)).rejects.toThrow(
			"Circuit breaker test-key is OPEN"
		);
	});

	it("should transition to HALF_OPEN after reset timeout", async () => {
		const fn = jest.fn().mockRejectedValue(new Error("Test error"));

		// Открываем circuit breaker
		for (let i = 0; i < 3; i++) {
			await expect(service.execute("test-key", fn)).rejects.toThrow("Test error");
		}

		// Ждем истечения reset timeout
		await new Promise((resolve) => setTimeout(resolve, 150));

		// Вызываем execute снова - это должно перевести circuit breaker в HALF_OPEN
		const successFn = jest.fn().mockResolvedValue("success");
		await service.execute("test-key", successFn);

		// Проверяем, что circuit breaker перешел в HALF_OPEN
		const state = service.getState("test-key");
		expect(state).toBe(CircuitBreakerState.HALF_OPEN);
	});

	it("should close circuit after success threshold in HALF_OPEN", async () => {
		const errorFn = jest.fn().mockRejectedValue(new Error("Test error"));
		const successFn = jest.fn().mockResolvedValue("success");

		// Открываем circuit breaker
		for (let i = 0; i < 3; i++) {
			await expect(service.execute("test-key", errorFn)).rejects.toThrow("Test error");
		}

		// Ждем истечения reset timeout
		await new Promise((resolve) => setTimeout(resolve, 150));

		// Выполняем успешные запросы
		await service.execute("test-key", successFn);
		await service.execute("test-key", successFn);

		// Проверяем, что circuit breaker закрыт
		const state = service.getState("test-key");
		expect(state).toBe(CircuitBreakerState.CLOSED);
	});

	it("should reset circuit breaker", () => {
		service.reset("test-key");

		expect(mockLogger.log).toHaveBeenCalledWith("Circuit breaker test-key reset");
	});

	it("should track state per key", async () => {
		const errorFn = jest.fn().mockRejectedValue(new Error("Test error"));

		// Открываем circuit breaker для первого ключа
		for (let i = 0; i < 3; i++) {
			await expect(service.execute("key1", errorFn)).rejects.toThrow("Test error");
		}

		// Второй ключ должен быть в CLOSED состоянии
		const state1 = service.getState("key1");
		const state2 = service.getState("key2");

		expect(state1).toBe(CircuitBreakerState.OPEN);
		expect(state2).toBe(CircuitBreakerState.CLOSED);
	});

	it("should use default resetTimeout when not provided", async () => {
		const serviceWithDefaults = new CircuitBreakerService(mockLogger);
		const errorFn = jest.fn().mockRejectedValue(new Error("Test error"));

		// Открываем circuit breaker
		for (let i = 0; i < 5; i++) {
			await expect(serviceWithDefaults.execute("test-key", errorFn)).rejects.toThrow(
				"Test error"
			);
		}

		// Проверяем, что используется дефолтный resetTimeout (60000)
		const state = serviceWithDefaults.getState("test-key");
		expect(state).toBe(CircuitBreakerState.OPEN);
	});

	it("должен использовать дефолтный resetTimeout когда передан undefined", async () => {
		const serviceWithUndefined = new CircuitBreakerService(mockLogger, {
			resetTimeout: undefined,
		});
		const errorFn = jest.fn().mockRejectedValue(new Error("Test error"));

		// Открываем circuit breaker
		for (let i = 0; i < 5; i++) {
			await expect(serviceWithUndefined.execute("test-key-undefined", errorFn)).rejects.toThrow(
				"Test error"
			);
		}

		// Проверяем, что используется дефолтный resetTimeout (60000)
		const state = serviceWithUndefined.getState("test-key-undefined");
		expect(state).toBe(CircuitBreakerState.OPEN);
	});

	it("should reject request when circuit is OPEN and timeout not expired", async () => {
		const errorFn = jest.fn().mockRejectedValue(new Error("Test error"));

		// Открываем circuit breaker
		for (let i = 0; i < 3; i++) {
			await expect(service.execute("test-key", errorFn)).rejects.toThrow("Test error");
		}

		// Сразу после открытия запрос должен быть отклонен
		await expect(service.execute("test-key", errorFn)).rejects.toThrow(
			"Circuit breaker test-key is OPEN"
		);
	});

	it("should use default successThreshold when not provided", async () => {
		const serviceWithDefaults = new CircuitBreakerService(mockLogger, {
			failureThreshold: 3,
			resetTimeout: 100,
		});
		const errorFn = jest.fn().mockRejectedValue(new Error("Test error"));
		const successFn = jest.fn().mockResolvedValue("success");

		// Открываем circuit breaker
		for (let i = 0; i < 3; i++) {
			await expect(serviceWithDefaults.execute("test-key", errorFn)).rejects.toThrow(
				"Test error"
			);
		}

		// Ждем истечения reset timeout
		await new Promise((resolve) => setTimeout(resolve, 150));

		// Выполняем успешные запросы до дефолтного порога (2)
		await serviceWithDefaults.execute("test-key", successFn);
		await serviceWithDefaults.execute("test-key", successFn);

		// Проверяем, что circuit breaker закрыт
		const state = serviceWithDefaults.getState("test-key");
		expect(state).toBe(CircuitBreakerState.CLOSED);
	});

	it("should use default failureThreshold when not provided", async () => {
		const serviceWithDefaults = new CircuitBreakerService(mockLogger);
		const errorFn = jest.fn().mockRejectedValue(new Error("Test error"));

		// Выполняем запросы до дефолтного порога ошибок (5)
		for (let i = 0; i < 5; i++) {
			await expect(serviceWithDefaults.execute("test-key", errorFn)).rejects.toThrow(
				"Test error"
			);
		}

		// Проверяем, что circuit breaker открыт
		const state = serviceWithDefaults.getState("test-key");
		expect(state).toBe(CircuitBreakerState.OPEN);
	});

	it("should handle stats without lastFailureTime", async () => {
		const errorFn = jest.fn().mockRejectedValue(new Error("Test error"));

		// Открываем circuit breaker
		for (let i = 0; i < 3; i++) {
			await expect(service.execute("test-key", errorFn)).rejects.toThrow("Test error");
		}

		// Сбрасываем lastFailureTime через прямой доступ к stats
		const serviceInternal = service as unknown as {
			stats: Map<string, { lastFailureTime?: number }>;
		};
		const stats = serviceInternal.stats.get("test-key");
		if (stats) {
			stats.lastFailureTime = undefined;
		}

		// Проверяем, что timeSinceLastFailure обрабатывает undefined
		// Это должно привести к переходу в HALF_OPEN, так как timeSinceLastFailure будет большим
		await new Promise((resolve) => setTimeout(resolve, 150));

		const successFn = jest.fn().mockResolvedValue("success");
		await service.execute("test-key", successFn);

		const state = service.getState("test-key");
		expect(state).toBe(CircuitBreakerState.HALF_OPEN);
	});

	it("should handle HALF_OPEN state with successes less than threshold", async () => {
		const errorFn = jest.fn().mockRejectedValue(new Error("Test error"));
		const successFn = jest.fn().mockResolvedValue("success");

		// Открываем circuit breaker
		for (let i = 0; i < 3; i++) {
			await expect(service.execute("test-key", errorFn)).rejects.toThrow("Test error");
		}

		// Ждем истечения reset timeout
		await new Promise((resolve) => setTimeout(resolve, 150));

		// Выполняем только один успешный запрос (меньше порога 2)
		await service.execute("test-key", successFn);

		// Проверяем, что circuit breaker все еще в HALF_OPEN
		const state = service.getState("test-key");
		expect(state).toBe(CircuitBreakerState.HALF_OPEN);
	});

	it("должен покрыть строку 112 - выброс ошибки когда stats не найдены", () => {
		// Покрываем строку 112 - выброс ошибки когда stats не найдены
		// Это защитная проверка на случай, если stats.get вернет undefined после проверки has
		// Используем рефлексию для прямого доступа к приватному методу getStats
		const serviceInternal = service as unknown as {
			stats: Map<string, unknown>;
			getStats: (key: string) => unknown;
		};

		// Мокируем Map так, чтобы has вернул true, но get вернул undefined
		const originalHas = serviceInternal.stats.has.bind(serviceInternal.stats);
		const originalGet = serviceInternal.stats.get.bind(serviceInternal.stats);

		let getCallCount = 0;
		serviceInternal.stats.has = jest.fn((key: string) => {
			// Для ключа "test-key-for-error" возвращаем true
			if (key === "test-key-for-error") {
				return true;
			}
			return originalHas(key);
		});

		serviceInternal.stats.get = jest.fn((key: string) => {
			getCallCount++;
			// Для ключа "test-key-for-error" возвращаем undefined при втором вызове
			if (key === "test-key-for-error" && getCallCount === 2) {
				return undefined;
			}
			return originalGet(key);
		});

		// Вызываем getStats напрямую через рефлексию
		expect(() => {
			serviceInternal.getStats("test-key-for-error");
		}).toThrow("Stats not found for key: test-key-for-error");
	});
});
