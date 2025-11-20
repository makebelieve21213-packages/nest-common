import { HttpStatus } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { RpcErrorType } from "src/types/rpc-types";

/**
 * Пользовательский класс ошибок RabbitMQ RPC соединения,
 * наследуется от RpcException для автоматической обработки глобальным фильтром
 */
export default class RpcError extends RpcException {
	readonly name: string = RpcError.name;

	constructor(
		readonly message: string,
		readonly errorType: RpcErrorType = RpcErrorType.SERVICE_UNAVAILABLE,
		readonly statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR,
		protected readonly originalError?: Error | unknown
	) {
		// Передаем объект с полной информацией для правильной сериализации через RabbitMQ
		super({
			message,
			errorType,
			statusCode,
		});

		// Фиксируем прототип для корректной работы instanceof
		Object.setPrototypeOf(this, RpcError.prototype);
	}

	// Переопределяем getError() для правильной сериализации через RabbitMQ
	getError(): {
		message: string;
		errorType: RpcErrorType;
		statusCode: number;
	} {
		return {
			message: this.message,
			errorType: this.errorType,
			statusCode: this.statusCode,
		};
	}

	// Метод для получения сообщения об ошибке (строковое представление)
	getMessage(): string {
		return this.message;
	}

	// Переопределяем getStatus() для возврата статус-кода
	getStatus(): number {
		return this.statusCode;
	}

	// Проверка, является ли ошибка временной (требует retry)
	// Ошибки валидации считаются постоянными и не требуют retry
	isTransient(): boolean {
		// Ошибки валидации - постоянные
		if (
			this.errorType === RpcErrorType.VALIDATION_ERROR ||
			this.errorType === RpcErrorType.RPC_VALIDATION_ERROR
		) {
			return false;
		}

		// Временные ошибки
		return (
			this.errorType === RpcErrorType.RPC_TIMEOUT ||
			this.errorType === RpcErrorType.SERVICE_UNAVAILABLE ||
			this.errorType === RpcErrorType.RPC_SERVICE_UNAVAILABLE
		);
	}

	// Определение типа ошибки по сообщению
	private static detectErrorType(message: string): RpcErrorType {
		const lowerMessage = message.toLowerCase();

		// Временные ошибки
		if (
			lowerMessage.includes("timeout") ||
			lowerMessage.includes("timed out") ||
			lowerMessage.includes("rpc_timeout")
		) {
			return RpcErrorType.RPC_TIMEOUT;
		}
		// Более специфичная проверка должна идти раньше общей
		if (
			lowerMessage.includes("rpc service unavailable") ||
			lowerMessage.includes("rpc_service_unavailable")
		) {
			return RpcErrorType.RPC_SERVICE_UNAVAILABLE;
		}
		if (
			lowerMessage.includes("service unavailable") ||
			lowerMessage.includes("service_unavailable") ||
			lowerMessage.includes("unavailable")
		) {
			return RpcErrorType.SERVICE_UNAVAILABLE;
		}

		// Постоянные ошибки
		// Ошибка 429 (Too Many Requests) - постоянная ошибка, не требует retry, сразу в DLX
		if (
			lowerMessage.includes("429") ||
			lowerMessage.includes("too many requests") ||
			lowerMessage.includes("rate limit") ||
			lowerMessage.includes("request failed with status code 429")
		) {
			return RpcErrorType.TOO_MANY_REQUESTS;
		}
		if (
			lowerMessage.includes("bad request") ||
			lowerMessage.includes("bad_request") ||
			lowerMessage.includes("invalid")
		) {
			return RpcErrorType.BAD_REQUEST;
		}
		if (
			lowerMessage.includes("unauthorized") ||
			lowerMessage.includes("authentication") ||
			lowerMessage.includes("auth")
		) {
			return RpcErrorType.UNAUTHORIZED;
		}
		if (
			lowerMessage.includes("forbidden") ||
			lowerMessage.includes("access denied") ||
			lowerMessage.includes("permission")
		) {
			return RpcErrorType.FORBIDDEN;
		}
		if (
			lowerMessage.includes("not found") ||
			lowerMessage.includes("not_found") ||
			lowerMessage.includes("404")
		) {
			return RpcErrorType.NOT_FOUND;
		}
		if (
			lowerMessage.includes("validation") ||
			lowerMessage.includes("validation_error") ||
			lowerMessage.includes("validate")
		) {
			return lowerMessage.includes("rpc")
				? RpcErrorType.RPC_VALIDATION_ERROR
				: RpcErrorType.VALIDATION_ERROR;
		}

		// По умолчанию - временная ошибка
		return RpcErrorType.SERVICE_UNAVAILABLE;
	}

	// Определение HTTP статус-кода по типу ошибки
	private static getStatusCodeForErrorType(errorType: RpcErrorType): number {
		switch (errorType) {
			case RpcErrorType.BAD_REQUEST:
				return HttpStatus.BAD_REQUEST;
			case RpcErrorType.UNAUTHORIZED:
				return HttpStatus.UNAUTHORIZED;
			case RpcErrorType.FORBIDDEN:
				return HttpStatus.FORBIDDEN;
			case RpcErrorType.NOT_FOUND:
				return HttpStatus.NOT_FOUND;
			case RpcErrorType.TOO_MANY_REQUESTS:
				return HttpStatus.TOO_MANY_REQUESTS;
			case RpcErrorType.VALIDATION_ERROR:
			case RpcErrorType.RPC_VALIDATION_ERROR:
				return HttpStatus.BAD_REQUEST;
			case RpcErrorType.RPC_TIMEOUT:
			case RpcErrorType.SERVICE_UNAVAILABLE:
			case RpcErrorType.RPC_SERVICE_UNAVAILABLE:
			default:
				return HttpStatus.INTERNAL_SERVER_ERROR;
		}
	}

	// Извлечение сообщения об ошибке из различных типов объектов
	private static extractMessage(error: unknown): string {
		if (error instanceof RpcException) {
			const errorData = error.getError() as string | { message: string };

			if (typeof errorData === "string") {
				return errorData;
			}

			return errorData.message ? errorData.message : String(errorData);
		}

		if (error instanceof Error) {
			return error.message;
		}

		if (typeof error === "object" && error !== null) {
			if ("message" in error && typeof error.message === "string") {
				return error.message;
			}
			if ("error" in error) {
				return this.extractMessage(error.error);
			}
		}

		return String(error);
	}

	// Статический метод для создания RpcError из неизвестной ошибки
	static fromUnknown(error: unknown): RpcError {
		if (error instanceof RpcError) {
			return error;
		}

		const message = this.extractMessage(error);
		const errorType = this.detectErrorType(message);
		const statusCode = this.getStatusCodeForErrorType(errorType);

		return new RpcError(message, errorType, statusCode, error);
	}
}
