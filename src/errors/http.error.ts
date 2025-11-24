import { HttpException, HttpStatus } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import RpcError from "src/errors/rpc.error";
import SocketError from "src/errors/socket.error";
import { ErrorType } from "src/types/error-types";

/**
 * Пользовательский класс ошибок HTTP соединения, наследуется от HttpException
 * для автоматической обработки глобальным фильтром
 */
export default class HttpError extends HttpException {
	readonly name: string = HttpError.name;

	constructor(
		readonly message: string,
		protected readonly statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR,
		protected readonly originalError?: Error | unknown
	) {
		super(
			{
				error: "InternalServerError",
				message,
			},
			statusCode
		);

		// Фиксируем прототип для корректной работы instanceof
		Object.setPrototypeOf(this, HttpError.prototype);
	}

	// Переопределяем getStatus() для возврата HTTP статус-кода
	getStatus(): number {
		return this.statusCode;
	}

	// Вспомогательная функция для извлечения message и statusCode
	// из сериализованного объекта ошибки
	private static extractFromSerializedError(error: unknown): {
		message: string;
		statusCode?: number;
	} {
		if (typeof error !== "object" || error === null) {
			return { message: String(error) };
		}

		const errorObj = error as Record<string, unknown>;
		const errorValue = errorObj.error;
		const messageFromError =
			typeof errorValue === "object" && errorValue !== null
				? (errorValue as Record<string, unknown>).message
				: errorValue;
		const message = String(messageFromError || errorObj.message || error);
		const statusCodeValue =
			typeof errorValue === "object" && errorValue !== null
				? (errorValue as Record<string, unknown>).statusCode
				: errorObj.statusCode;
		const statusCode =
			typeof statusCodeValue === "number" && statusCodeValue >= HttpStatus.BAD_REQUEST
				? statusCodeValue
				: undefined;

		return { message, statusCode };
	}

	// Вспомогательная функция для определения типа ошибки
	private static getErrorType(error: Error | unknown): ErrorType {
		if (error instanceof HttpError) return ErrorType.HTTP_ERROR;
		if (error instanceof SocketError) return ErrorType.SOCKET_ERROR;
		if (error instanceof RpcError) return ErrorType.RPC_ERROR;
		if (error instanceof RpcException) return ErrorType.RPC_EXCEPTION;
		if (error instanceof HttpException) return ErrorType.HTTP_EXCEPTION;
		if (error instanceof Error) return ErrorType.ERROR;
		if (typeof error === "object" && error !== null) {
			const errorObj = error as Record<string, unknown>;
			// Проверяем, является ли объект десериализованным RpcError
			// (формат от NestJS ClientProxy)
			if ("errorType" in errorObj && "statusCode" in errorObj && "message" in errorObj) {
				return ErrorType.DESERIALIZED_RPC_ERROR;
			}
			// Проверяем формат { status: 'error', message: '...' }
			// от NestJS ClientProxy при RpcException
			if ("status" in errorObj && errorObj.status === "error" && "message" in errorObj) {
				return ErrorType.NEST_RPC_EXCEPTION;
			}
			return ErrorType.OBJECT;
		}
		return ErrorType.UNKNOWN;
	}

	// Статический метод для создания HttpError из неизвестной ошибки
	static fromUnknown(error: Error | unknown, descriptionPrefix?: string): HttpError {
		const errorType = HttpError.getErrorType(error);

		let message: string;
		let statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR;

		switch (errorType) {
			case ErrorType.HTTP_ERROR: {
				return error as HttpError;
			}

			case ErrorType.SOCKET_ERROR: {
				const socketError = error as SocketError;

				message = socketError.getMessage();
				statusCode = socketError.getStatus();

				break;
			}

			case ErrorType.RPC_ERROR: {
				const rpcError = error as RpcError;
				message = rpcError.getMessage();
				statusCode = rpcError.getStatus();

				break;
			}

			case ErrorType.RPC_EXCEPTION: {
				const rpcException = error as RpcException;
				const errorData = rpcException.getError();
				const messageValue =
					typeof errorData === "string"
						? errorData
						: errorData instanceof Error
							? errorData.message
							: typeof errorData === "object" && errorData !== null
								? (errorData as Record<string, unknown>).message
								: null;

				message = String(messageValue ?? errorData);
				statusCode =
					error instanceof RpcError ? (error as RpcError).statusCode : HttpStatus.INTERNAL_SERVER_ERROR;

				break;
			}

			case ErrorType.DESERIALIZED_RPC_ERROR: {
				// Обрабатываем десериализованный RpcError объект (приходит из RabbitMQ)
				const errorObj = error as Record<string, unknown>;
				message = String(errorObj.message || "RPC error occurred");
				statusCode =
					typeof errorObj.statusCode === "number" && errorObj.statusCode >= HttpStatus.BAD_REQUEST
						? errorObj.statusCode
						: HttpStatus.INTERNAL_SERVER_ERROR;

				break;
			}

			case ErrorType.NEST_RPC_EXCEPTION: {
				// Обрабатываем формат { status: 'error', message: '...', data: {...} }
				// от NestJS ClientProxy
				const errorObj = error as Record<string, unknown>;
				const data = errorObj.data as Record<string, unknown> | undefined;

				// Извлекаем message из data.message или errorObj.message
				message = String(data?.message || errorObj.message || "RPC error occurred");

				// Извлекаем statusCode из data.statusCode
				statusCode =
					typeof data?.statusCode === "number" && data.statusCode >= HttpStatus.BAD_REQUEST
						? data.statusCode
						: HttpStatus.INTERNAL_SERVER_ERROR;

				break;
			}

			case ErrorType.HTTP_EXCEPTION: {
				const httpException = error as HttpException;
				const res = httpException.getResponse();
				const messageValue =
					(typeof res === "object" && res !== null ? (res as Record<string, unknown>).message : null) ??
					res;

				message = Array.isArray(messageValue) ? messageValue.join("; ") : String(messageValue);
				statusCode = httpException.getStatus();

				break;
			}

			case ErrorType.ERROR: {
				const errorInstance = error as Error;
				message = errorInstance.message;
				break;
			}

			case ErrorType.OBJECT: {
				const extracted = HttpError.extractFromSerializedError(error);

				message = extracted.message;
				statusCode = extracted.statusCode ?? statusCode;

				break;
			}

			default: {
				message = String(error);
			}
		}

		return new HttpError(
			descriptionPrefix ? `${descriptionPrefix}: ${message}` : message,
			statusCode,
			error
		);
	}
}
