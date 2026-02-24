import { existsSync } from "fs";
import { join, resolve } from "path";

import type { GetServicePathOptions } from "src/types/get-service-path-types";

/**
 * Универсальная функция для определения пути в сервисе
 * независимо от точки запуска и режима (dev/production)
 * Работает одинаково в dev (src) и production (dist) режимах,
 * всегда используя пути относительно src/
 */
export default function getServicePath(options: GetServicePathOptions): string {
	const { serviceName, dirname, pathType, relativePath } = options;

	// Определяем, начинается ли relativePath с "src/"
	const pathWithoutSrc = relativePath.startsWith("src/") ? relativePath.slice(4) : relativePath;

	/**
	 * Находим корень сервиса (где находится папка src)
	 * Идем вверх от dirname до тех пор, пока не найдем папку src
	 */
	let currentPath = dirname;
	let serviceRoot: string | null = null;
	const maxDepth = 10; // Защита от бесконечного цикла

	for (let i = 0; i < maxDepth; i++) {
		const srcPath = join(currentPath, "src");
		if (existsSync(srcPath)) {
			serviceRoot = currentPath;
			break;
		}
		const parentPath = resolve(currentPath, "..");
		if (parentPath === currentPath) {
			// Достигли корня файловой системы
			break;
		}
		currentPath = parentPath;
	}

	// Если не нашли через dirname, пробуем через process.cwd()
	if (!serviceRoot) {
		const cwdSrcPath = join(process.cwd(), "src");
		if (existsSync(cwdSrcPath)) {
			serviceRoot = process.cwd();
		}
	}

	// Если все еще не нашли, пробуем через корень репозитория
	if (!serviceRoot) {
		const repoRoot = resolve(process.cwd(), "services", serviceName);
		const repoSrcPath = join(repoRoot, "src");
		if (existsSync(repoSrcPath)) {
			serviceRoot = repoRoot;
		}
	}

	// Если не нашли корень сервиса, выбрасываем ошибку
	if (!serviceRoot) {
		throw new Error(
			`Не удалось найти корень сервиса "${serviceName}". Проверьте, что папка src существует в сервисе или запустите из корня сервиса.`
		);
	}

	// Формируем итоговый путь в зависимости от типа
	switch (pathType) {
		case "srcRoot": {
			return serviceRoot;
		}
		case "locales": {
			// Всегда используем src/locales
			return join(serviceRoot, "src", "locales");
		}
		case "file": {
			// Всегда используем src/ для файлов
			return join(serviceRoot, "src", pathWithoutSrc);
		}
	}
}
