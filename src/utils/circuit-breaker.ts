import NestCommonError from "src/errors/nest-common.error";
import {
	CircuitBreakerState,
	type CircuitBreakerOptions,
	type CircuitBreakerStats,
} from "src/types/circuit-breaker-types";

import type { LoggerService } from "@makebelieve21213-packages/logger";

// Сервис для реализации Circuit Breaker паттерна
export default class CircuitBreakerService {
	private stats: Map<string, CircuitBreakerStats> = new Map();

	constructor(
		private readonly logger: LoggerService,
		private readonly options: CircuitBreakerOptions = {}
	) {
		this.logger.setContext(CircuitBreakerService.name);
	}

	// Выполняет функцию с защитой Circuit Breaker
	async execute<T>(key: string, fn: () => Promise<T>): Promise<T> {
		const stats = this.getStats(key);
		const state = this.getState(key);

		// Проверяем состояние Circuit Breaker
		if (state === CircuitBreakerState.OPEN) {
			const resetTimeout = this.options.resetTimeout || 60000; // 1 минута по умолчанию
			const timeSinceLastFailure = Date.now() - (stats.lastFailureTime || 0);

			if (timeSinceLastFailure >= resetTimeout) {
				// Переходим в HALF_OPEN состояние
				this.setState(key, CircuitBreakerState.HALF_OPEN);
				this.logger.warn(`Circuit breaker ${key} transitioned to HALF_OPEN`);
			} else {
				throw new NestCommonError(`Circuit breaker ${key} is OPEN. Request rejected.`);
			}
		}

		try {
			// Выполняем функцию
			const result = await fn();

			// Увеличиваем счетчик успешных запросов
			stats.successes++;

			// Если в HALF_OPEN состоянии и достигли порога успешных запросов
			if (
				state === CircuitBreakerState.HALF_OPEN &&
				stats.successes >= (this.options.successThreshold || 2)
			) {
				this.setState(key, CircuitBreakerState.CLOSED);
				this.resetStats(key);
				this.logger.log(`Circuit breaker ${key} closed`);
			}

			return result;
		} catch (error: Error | unknown) {
			// Увеличиваем счетчик ошибок
			stats.failures++;
			stats.lastFailureTime = Date.now();

			// Если достигли порога ошибок
			if (stats.failures >= (this.options.failureThreshold || 5)) {
				this.setState(key, CircuitBreakerState.OPEN);
				this.logger.error(`Circuit breaker ${key} opened due to ${stats.failures} failures`);
			}

			throw error;
		}
	}

	// Получает текущее состояние Circuit Breaker
	getState(key: string): CircuitBreakerState {
		const stats = this.getStats(key);
		return stats.state;
	}

	// Устанавливает состояние Circuit Breaker
	private setState(key: string, state: CircuitBreakerState): void {
		const stats = this.getStats(key);
		stats.state = state;
		stats.lastStateChangeTime = Date.now();
	}

	// Получает статистику для ключа
	private getStats(key: string): CircuitBreakerStats {
		if (!this.stats.has(key)) {
			this.stats.set(key, {
				failures: 0,
				successes: 0,
				state: CircuitBreakerState.CLOSED,
				lastStateChangeTime: Date.now(),
			});
		}

		const stats = this.stats.get(key);
		if (!stats) {
			throw new Error(`Stats not found for key: ${key}`);
		}
		return stats;
	}

	// Сбрасывает статистику для ключа
	private resetStats(key: string): void {
		const stats = this.getStats(key);
		stats.failures = 0;
		stats.successes = 0;
		stats.lastFailureTime = undefined;
	}

	// Сбрасывает Circuit Breaker для ключа
	reset(key: string): void {
		this.stats.delete(key);
		this.logger.log(`Circuit breaker ${key} reset`);
	}
}
