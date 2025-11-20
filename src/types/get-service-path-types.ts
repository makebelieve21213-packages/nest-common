// Типы путей для определения
export type ServicePathType = "locales" | "srcRoot" | "file";

// Опции для определения пути в сервисе
export interface GetServicePathOptions {
	// Имя сервиса (например, "api-service", "chat-service")
	serviceName: string;
	// Директория конфига или сервиса (__dirname из config файла или service файла)
	dirname: string;
	// Тип пути: 'locales' - путь к локалям, 'srcRoot' - корень сервиса, 'file' - путь к файлу
	pathType: ServicePathType;
	/**
	 * Относительный путь от src директории
	 * Для 'locales': "locales" (будет преобразован в "src/locales")
	 * Для 'srcRoot': "src" (возвращает корень сервиса)
	 * Для 'file': "chat/workers/ai-sdk.worker.ts"
	 * (будет преобразован в "src/chat/workers/ai-sdk.worker.ts")
	 * Если путь начинается с "src/", префикс будет удален
	 */
	relativePath: string;
}
