import type { CorsOptions } from "@nestjs/common/interfaces/external/cors-options.interface";
import type { CorsOptionsConfig } from "src/types/cors-types";

// Создает опции CORS для NestJS приложения
export default function createCorsOptions(config: CorsOptionsConfig = {}): CorsOptions {
	const {
		origin = true, // Разрешаем все источники по умолчанию
		methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
		allowedHeaders = [
			"Content-Type",
			"Authorization",
			"X-Requested-With",
			"X-Request-ID",
			"X-API-Key",
		],
		exposedHeaders = ["X-Request-ID"],
		credentials = true,
		maxAge = 86400, // 24 часа
		preflightContinue = false,
		optionsSuccessStatus = 204,
	} = config;

	return {
		origin,
		methods,
		allowedHeaders,
		exposedHeaders,
		credentials,
		maxAge,
		preflightContinue,
		optionsSuccessStatus,
	};
}
