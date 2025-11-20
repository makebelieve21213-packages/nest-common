// Коды ошибок JSON-RPC 2.0 согласно спецификации
export enum JsonRpcErrorCode {
	// Стандартные коды ошибок JSON-RPC 2.0
	PARSE_ERROR = -32700, // Ошибка парсинга JSON
	INVALID_REQUEST = -32600, // Невалидный запрос
	METHOD_NOT_FOUND = -32601, // Метод не найден
	INVALID_PARAMS = -32602, // Невалидные параметры
	INTERNAL_ERROR = -32603, // Внутренняя ошибка сервера

	// Кастомные коды ошибок (от -32000 до -32099)
	UNAUTHORIZED = -32001, // Неавторизованный доступ (401)
	FORBIDDEN = -32002, // Доступ запрещен (403)
	NOT_FOUND = -32003, // Ресурс не найден (404)
	TOO_MANY_REQUESTS = -32004, // Слишком много запросов (429)
	SERVER_ERROR = -32005, // Ошибка сервера (500)
	BAD_GATEWAY = -32006, // Ошибка шлюза (502)
	SERVICE_UNAVAILABLE = -32007, // Сервис недоступен (503)
	GATEWAY_TIMEOUT = -32008, // Таймаут шлюза (504)
}

// Сообщения по умолчанию для кодов ошибок
export const JSON_RPC_ERROR_MESSAGES: Record<JsonRpcErrorCode, string> = {
	[JsonRpcErrorCode.PARSE_ERROR]: "Parse error",
	[JsonRpcErrorCode.INVALID_REQUEST]: "Invalid Request",
	[JsonRpcErrorCode.METHOD_NOT_FOUND]: "Method not found",
	[JsonRpcErrorCode.INVALID_PARAMS]: "Invalid params",
	[JsonRpcErrorCode.INTERNAL_ERROR]: "Internal error",
	[JsonRpcErrorCode.UNAUTHORIZED]: "Unauthorized",
	[JsonRpcErrorCode.FORBIDDEN]: "Forbidden",
	[JsonRpcErrorCode.NOT_FOUND]: "Not Found",
	[JsonRpcErrorCode.TOO_MANY_REQUESTS]: "Too Many Requests",
	[JsonRpcErrorCode.SERVER_ERROR]: "Internal Server Error",
	[JsonRpcErrorCode.BAD_GATEWAY]: "Bad Gateway",
	[JsonRpcErrorCode.SERVICE_UNAVAILABLE]: "Service Unavailable",
	[JsonRpcErrorCode.GATEWAY_TIMEOUT]: "Gateway Timeout",
};

// Имена ошибок на русском языке
export const JSON_RPC_ERROR_NAMES: Record<JsonRpcErrorCode, string> = {
	[JsonRpcErrorCode.PARSE_ERROR]: "Ошибка парсинга",
	[JsonRpcErrorCode.INVALID_REQUEST]: "Невалидный запрос",
	[JsonRpcErrorCode.METHOD_NOT_FOUND]: "Метод не найден",
	[JsonRpcErrorCode.INVALID_PARAMS]: "Невалидные параметры",
	[JsonRpcErrorCode.INTERNAL_ERROR]: "Внутренняя ошибка",
	[JsonRpcErrorCode.UNAUTHORIZED]: "Не авторизован",
	[JsonRpcErrorCode.FORBIDDEN]: "Доступ запрещен",
	[JsonRpcErrorCode.NOT_FOUND]: "Не найдено",
	[JsonRpcErrorCode.TOO_MANY_REQUESTS]: "Много запросов",
	[JsonRpcErrorCode.SERVER_ERROR]: "Ошибка сервера",
	[JsonRpcErrorCode.BAD_GATEWAY]: "Ошибка шлюза",
	[JsonRpcErrorCode.SERVICE_UNAVAILABLE]: "Сервис недоступен",
	[JsonRpcErrorCode.GATEWAY_TIMEOUT]: "Таймаут шлюза",
};

// Маппинг HTTP статусов на JsonRpcErrorCode
export function mapHttpStatusToJsonRpcErrorCode(
	status: number,
): JsonRpcErrorCode {
	switch (status) {
		case 401:
			return JsonRpcErrorCode.UNAUTHORIZED;
		case 403:
			return JsonRpcErrorCode.FORBIDDEN;
		case 404:
			return JsonRpcErrorCode.NOT_FOUND;
		case 429:
			return JsonRpcErrorCode.TOO_MANY_REQUESTS;
		case 500:
			return JsonRpcErrorCode.SERVER_ERROR;
		case 502:
			return JsonRpcErrorCode.BAD_GATEWAY;
		case 503:
			return JsonRpcErrorCode.SERVICE_UNAVAILABLE;
		case 504:
			return JsonRpcErrorCode.GATEWAY_TIMEOUT;
		default:
			// Для остальных 5xx ошибок используем SERVER_ERROR
			if (status >= 500) {
				return JsonRpcErrorCode.SERVER_ERROR;
			}
			// Для остальных 4xx ошибок используем INTERNAL_ERROR
			if (status >= 400) {
				return JsonRpcErrorCode.INTERNAL_ERROR;
			}
			// Для всех остальных случаев используем INTERNAL_ERROR
			return JsonRpcErrorCode.INTERNAL_ERROR;
	}
}

// Получает статус из ошибки, если она наследуется от Error и имеет поле status или statusCode
export function getErrorStatus(error: Error | unknown): number | undefined {
	if (!(error instanceof Error)) {
		return undefined;
	}

	// Проверяем поле status (как в AiToolsError)
	if ("status" in error && typeof error.status === "number") {
		return error.status;
	}

	// Проверяем поле statusCode (как в RpcRequestError)
	if ("statusCode" in error && typeof error.statusCode === "number") {
		return error.statusCode;
	}

	return undefined;
}

