import { LoggerService } from "@makebelieve21213-packages/logger";
import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus } from "@nestjs/common";
import JsonRpcException from "src/errors/json-rpc.error";
import {
	JsonRpcErrorCode,
	JSON_RPC_ERROR_MESSAGES,
	JSON_RPC_ERROR_NAMES,
	mapHttpStatusToJsonRpcErrorCode,
	getErrorStatus,
} from "src/types/json-rpc-error-codes";

import type { Request, Response } from "express";
import type { JsonRpcResponse } from "src/types/json-rpc-types";

// Фильтр исключений для MCP контроллера
// Преобразует все исключения NestJS в формат JSON-RPC 2.0
@Catch()
export default class JsonRpcExceptionFilter implements ExceptionFilter {
	constructor(private readonly logger: LoggerService) {
		this.logger.setContext(JsonRpcExceptionFilter.name);
	}

	catch(exception: unknown, host: ArgumentsHost): void {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse<Response>();
		const request = ctx.getRequest<Request>();

		// Пытаемся извлечь request ID из тела запроса
		const requestBody = request.body as { id?: number | string | null };
		const requestId = requestBody?.id ?? null;

		// Определяем тип исключения для switch case
		const exceptionType =
			exception instanceof JsonRpcException
				? "JsonRpcException"
				: exception instanceof Error
					? "Error"
					: "Unknown";

		let jsonRpcResponse: JsonRpcResponse;
		let httpStatus: HttpStatus;

		switch (exceptionType) {
			case "JsonRpcException": {
				const rpcException = exception as JsonRpcException;
				const rpcErrorCode = rpcException.getRpcErrorCode();
				const rpcData = rpcException.getRpcData();
				const exceptionResponse = rpcException.getResponse();

				const errorMessage =
					typeof exceptionResponse === "object" &&
					exceptionResponse !== null &&
					"error" in exceptionResponse &&
					typeof exceptionResponse.error === "object" &&
					exceptionResponse.error !== null &&
					"message" in exceptionResponse.error
						? String(exceptionResponse.error.message)
						: JSON_RPC_ERROR_MESSAGES[rpcErrorCode];

				jsonRpcResponse = {
					jsonrpc: "2.0",
					id: requestId,
					error: {
						code: rpcErrorCode,
						message: errorMessage,
						...(rpcData !== undefined && { data: rpcData }),
					},
				};

				httpStatus = rpcException.getStatus();

				this.logger.error(
					`JSON-RPC error: code=${rpcErrorCode}, message=${errorMessage}, id=${requestId}, response=${JSON.stringify(jsonRpcResponse)}`
				);
				break;
			}

			case "Error": {
				const error = exception as Error;
				const errorStatus = getErrorStatus(error);
				const rpcErrorCode = errorStatus
					? mapHttpStatusToJsonRpcErrorCode(errorStatus)
					: JsonRpcErrorCode.INTERNAL_ERROR;
				const httpStatusForError = errorStatus || HttpStatus.INTERNAL_SERVER_ERROR;

				jsonRpcResponse = {
					jsonrpc: "2.0",
					id: requestId,
					error: {
						code: rpcErrorCode,
						message: error.message || JSON_RPC_ERROR_MESSAGES[rpcErrorCode],
						data: {
							name: JSON_RPC_ERROR_NAMES[rpcErrorCode],
							originalError: error.name,
						},
					},
				};

				httpStatus = httpStatusForError;

				this.logger.error(
					`Error in JSON-RPC handler: ${error.message}, response=${JSON.stringify(jsonRpcResponse)}`,
					error.stack
				);
				break;
			}

			case "Unknown":
			default: {
				jsonRpcResponse = {
					jsonrpc: "2.0",
					id: requestId,
					error: {
						code: JsonRpcErrorCode.INTERNAL_ERROR,
						message: JSON_RPC_ERROR_MESSAGES[JsonRpcErrorCode.INTERNAL_ERROR],
						data: {
							name: JSON_RPC_ERROR_NAMES[JsonRpcErrorCode.INTERNAL_ERROR],
						},
					},
				};

				httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;

				this.logger.error(
					`Unknown error in JSON-RPC handler: ${String(exception)}, response=${JSON.stringify(jsonRpcResponse)}`
				);
				break;
			}
		}

		response.status(httpStatus).json(jsonRpcResponse);
	}
}
