import type { LoggerService } from "@makebelieve21213-packages/logger";

/**
 * Создает мок для LoggerService с полным покрытием всех методов
 * Используется для тестирования классов, которые принимают LoggerService в конструкторе
 */
export function createLoggerServiceMock(): jest.Mocked<LoggerService> {
	return {
		setContext: jest.fn(),
		log: jest.fn(),
		error: jest.fn(),
		warn: jest.fn(),
		debug: jest.fn(),
		verbose: jest.fn(),
		onModuleDestroy: jest.fn(),
	} as unknown as jest.Mocked<LoggerService>;
}
