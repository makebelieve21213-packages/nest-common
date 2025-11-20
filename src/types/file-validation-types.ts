// Опции для валидации файла
export interface FileValidationOptions {
	maxSize?: number; // Максимальный размер в байтах
	allowedMimeTypes?: string[]; // Разрешенные MIME типы
	allowedExtensions?: string[]; // Разрешенные расширения файлов
}

// Результат валидации файла
export interface FileValidationResult {
	isValid: boolean;
	errors: string[];
}
