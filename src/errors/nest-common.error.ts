// Базовый класс ошибок пакета nest-common
export default class NestCommonError extends Error {
	readonly name: string = NestCommonError.name;

	constructor(
		readonly message: string,
		protected readonly originalError?: Error | unknown
	) {
		super(message);

		// Фиксируем прототип для корректной работы instanceof
		Object.setPrototypeOf(this, NestCommonError.prototype);

		// Сохраняем стек вызовов
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, NestCommonError);
		}
	}
}
