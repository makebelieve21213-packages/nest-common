// Состояния Circuit Breaker
export enum CircuitBreakerState {
	CLOSED = "CLOSED", // Нормальная работа
	OPEN = "OPEN", // Разомкнут (ошибки превысили порог)
	HALF_OPEN = "HALF_OPEN", // Полуоткрыт (тестирование восстановления)
}

// Опции для Circuit Breaker
export interface CircuitBreakerOptions {
	failureThreshold?: number; // Порог ошибок для открытия
	successThreshold?: number; // Порог успешных запросов для закрытия
	timeout?: number; // Время ожидания в открытом состоянии (мс)
	resetTimeout?: number; // Время до перехода в HALF_OPEN (мс)
}

// Статистика Circuit Breaker
export interface CircuitBreakerStats {
	failures: number;
	successes: number;
	state: CircuitBreakerState;
	lastFailureTime?: number;
	lastStateChangeTime: number;
}
