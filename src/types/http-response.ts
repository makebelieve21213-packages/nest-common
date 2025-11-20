// Формирование объекта ответа ошибки HTTP-соединения на фронтенд
export default interface ErrorResponse {
	statusCode: number;
	timestamp: string;
	path: string;
	error: string;
	message: string;
	stack?: string;
}

// Интерфейс стандартизированного ответа
export interface StandardResponse<T = unknown> {
	success: boolean;
	data: T;
	meta?: {
		timestamp: string;
		path?: string;
		requestId?: string;
		[key: string]: unknown;
	};
}
