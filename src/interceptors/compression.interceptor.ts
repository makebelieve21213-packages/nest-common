import { gzipSync } from "zlib";

import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

// Interceptor для автоматического сжатия больших ответов
@Injectable()
export default class CompressionInterceptor implements NestInterceptor {
	constructor(
		private readonly threshold: number = 1024, // Порог размера в байтах
		private readonly minCompressionRatio: number = 0.8 // Минимальный коэффициент сжатия
	) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		return next.handle().pipe(
			map((data) => {
				// Преобразуем данные в строку для проверки размера
				const dataString = JSON.stringify(data);
				const dataSize = Buffer.byteLength(dataString, "utf8");

				// Если размер меньше порога, возвращаем без сжатия
				if (dataSize < this.threshold) {
					return data;
				}

				// Сжимаем данные
				const compressed = gzipSync(dataString);
				const compressedSize = compressed.length;
				const compressionRatio = compressedSize / dataSize;

				// Если сжатие неэффективно, возвращаем без сжатия
				if (compressionRatio >= this.minCompressionRatio) {
					return data;
				}

				// Устанавливаем заголовки для сжатого контента
				const response = context.switchToHttp().getResponse();
				response.setHeader("Content-Encoding", "gzip");
				response.setHeader("Content-Type", "application/json");

				return compressed;
			})
		);
	}
}
