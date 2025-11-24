import type { MulterFile } from "src/types/file-types";
import type { FileValidationOptions, FileValidationResult } from "src/types/file-validation-types";

// Валидирует файл по заданным опциям
export function validateFile(
	file: MulterFile,
	options: FileValidationOptions = {}
): FileValidationResult {
	const errors: string[] = [];
	const {
		maxSize = 10 * 1024 * 1024, // 10MB по умолчанию
		allowedMimeTypes,
		allowedExtensions,
	} = options;

	// Проверка размера файла
	if (file.size > maxSize) {
		errors.push(`File size exceeds maximum allowed size of ${maxSize} bytes`);
	}

	// Проверка MIME типа
	if (allowedMimeTypes && allowedMimeTypes.length > 0) {
		if (!allowedMimeTypes.includes(file.mimetype)) {
			errors.push(
				`File type ${file.mimetype} is not allowed. Allowed types: ${allowedMimeTypes.join(", ")}`
			);
		}
	}

	// Проверка расширения файла
	if (allowedExtensions && allowedExtensions.length) {
		const fileExtension = file.originalname.split(".").pop()?.toLowerCase();
		if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
			errors.push(
				`File extension ${fileExtension || "unknown"} is not allowed. Allowed extensions: ${allowedExtensions.join(", ")}`
			);
		}
	}

	return {
		isValid: !errors.length,
		errors,
	};
}

// Получает расширение файла из имени
export function getFileExtension(filename: string): string {
	const parts = filename.split(".");
	return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

// Форматирует размер файла в читаемый формат
export function formatFileSize(bytes: number): string {
	if (!bytes) return "0 Bytes";

	const k = 1024;
	const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}
