import { HttpException, HttpStatus } from "@nestjs/common";

/**
 * Пользовательский класс ошибок WebSocket соединения,
 * наследуется от HttpException для автоматической обработки
 * глобальным фильтром в HTTP контексте
 */
export default class SocketError extends HttpException {
	readonly name: string = SocketError.name;

	constructor(
		readonly message: string,
		protected readonly originalError?: Error | unknown
	) {
		super(
			{
				error: "WebSocketError",
				message,
			},
			HttpStatus.INTERNAL_SERVER_ERROR
		);

		// Фиксируем прототип для корректной работы instanceof
		Object.setPrototypeOf(this, SocketError.prototype);
	}

	// Переопределяем getResponse() для возврата структурированного ответа
	getResponse(): {
		error: string;
		message: string;
	} {
		return {
			error: "WebSocketError",
			message: this.message,
		};
	}

	// Метод для получения сообщения об ошибке (строковое представление)
	getMessage(): string {
		return this.message;
	}

	// Переопределяем getStatus() для возврата HTTP статус-кода
	getStatus(): number {
		return HttpStatus.INTERNAL_SERVER_ERROR;
	}

	// Статический метод для создания SocketError из неизвестной ошибки
	static fromUnknown(error: unknown): SocketError {
		if (error instanceof SocketError) {
			return error;
		}

		if (error instanceof Error) {
			return new SocketError(error.message, error);
		}

		return new SocketError(String(error), error);
	}
}
