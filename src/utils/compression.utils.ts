import type { Request, Response } from "express";
import type {
	CompressionOptions,
	CompressionOptionsConfig,
} from "src/types/compression-types";

// Создает опции compression для NestJS приложения
export default function createCompressionOptions(
	config: CompressionOptionsConfig = {}
): CompressionOptions {
	const {
		filter = (req: Request, res: Response) => {
			// Фильтр по умолчанию: сжимаем только текстовые типы контента
			if (req.headers && "accept-encoding" in req.headers) {
				const contentType = res.getHeader("content-type");
				return /text|json|javascript|css|xml|html/i.test(
					(typeof contentType === "string" ? contentType : "") || ""
				);
			}
			return false;
		},
		level = 6, // Уровень сжатия от 0 до 9
		threshold = 1024, // Минимальный размер ответа для сжатия (в байтах)
		chunkSize = 16 * 1024, // Размер чанка
		windowBits = 15,
		memLevel = 8,
		strategy,
		dictionary,
	} = config;

	return {
		filter,
		level,
		threshold,
		chunkSize,
		windowBits,
		memLevel,
		...(strategy !== undefined && { strategy }),
		...(dictionary !== undefined && { dictionary }),
	};
}
