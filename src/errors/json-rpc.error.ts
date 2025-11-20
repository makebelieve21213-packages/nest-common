import { HttpException, HttpStatus } from "@nestjs/common";
import {
	JsonRpcErrorCode,
	JSON_RPC_ERROR_MESSAGES,
	mapHttpStatusToJsonRpcErrorCode,
} from "src/types/json-rpc-error-codes";

// Кастомное исключение для JSON-RPC 2.0 протокола
// Наследуется от HttpException для совместимости с NestJS фильтрами
export default class JsonRpcException extends HttpException {
	private readonly rpcErrorCode: JsonRpcErrorCode;
	private readonly rpcData?: unknown;

	constructor(
		rpcErrorCode: JsonRpcErrorCode,
		message?: string,
		data?: unknown,
		httpStatus?: HttpStatus,
	) {
		const rpcMessage = message || JSON_RPC_ERROR_MESSAGES[rpcErrorCode];
		const status =
			httpStatus || JsonRpcException.getHttpStatus(rpcErrorCode);

		super(
			{
				jsonrpc: "2.0",
				error: {
					code: rpcErrorCode,
					message: rpcMessage,
					...(data !== undefined && { data }),
				},
			},
			status,
		);

		this.rpcErrorCode = rpcErrorCode;
		this.rpcData = data;
	}

	// Получить JSON-RPC код ошибки
	getRpcErrorCode(): JsonRpcErrorCode {
		return this.rpcErrorCode;
	}

	// Получить данные ошибки
	getRpcData(): unknown {
		return this.rpcData;
	}

	// Создать JsonRpcException из стандартного HttpException
	static fromHttpException(
		exception: HttpException,
		requestId: number | string | null = null,
	): JsonRpcException {
		const status = exception.getStatus();
		const response = exception.getResponse();
		const message =
			typeof response === "string"
				? response
				: typeof response === "object" &&
						response !== null &&
						"message" in response
					? String(response.message)
					: exception.message;

		const rpcErrorCode = mapHttpStatusToJsonRpcErrorCode(status);

		return new JsonRpcException(rpcErrorCode, message, { requestId });
	}

	// Создать JsonRpcException из обычной Error
	static fromError(
		error: Error,
		requestId: number | string | null = null,
	): JsonRpcException {
		return new JsonRpcException(
			JsonRpcErrorCode.INTERNAL_ERROR,
			error.message,
			{ requestId, name: error.name },
		);
	}

	// Получить HTTP статус из JSON-RPC кода ошибки
	private static getHttpStatus(rpcErrorCode: JsonRpcErrorCode): HttpStatus {
		switch (rpcErrorCode) {
			case JsonRpcErrorCode.PARSE_ERROR:
			case JsonRpcErrorCode.INVALID_REQUEST:
			case JsonRpcErrorCode.INVALID_PARAMS:
				return HttpStatus.BAD_REQUEST;
			case JsonRpcErrorCode.UNAUTHORIZED:
				return HttpStatus.UNAUTHORIZED;
			case JsonRpcErrorCode.FORBIDDEN:
				return HttpStatus.FORBIDDEN;
			case JsonRpcErrorCode.NOT_FOUND:
			case JsonRpcErrorCode.METHOD_NOT_FOUND:
				return HttpStatus.NOT_FOUND;
			case JsonRpcErrorCode.TOO_MANY_REQUESTS:
				return HttpStatus.TOO_MANY_REQUESTS;
			case JsonRpcErrorCode.BAD_GATEWAY:
				return HttpStatus.BAD_GATEWAY;
			case JsonRpcErrorCode.SERVICE_UNAVAILABLE:
				return HttpStatus.SERVICE_UNAVAILABLE;
			case JsonRpcErrorCode.GATEWAY_TIMEOUT:
				return HttpStatus.GATEWAY_TIMEOUT;
			case JsonRpcErrorCode.INTERNAL_ERROR:
			case JsonRpcErrorCode.SERVER_ERROR:
			default:
				return HttpStatus.INTERNAL_SERVER_ERROR;
		}
	}
}

