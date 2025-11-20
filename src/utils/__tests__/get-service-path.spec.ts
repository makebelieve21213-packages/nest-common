import { existsSync } from "fs";
import { join, resolve } from "path";

import getServicePath from "src/utils/get-service-path";

import type { GetServicePathOptions } from "src/types/get-service-path-types";

jest.mock("fs");
jest.mock("path", () => ({
	...jest.requireActual("path"),
	resolve: jest.fn(),
	join: jest.fn(),
}));

describe("getServicePath", () => {
	const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
	const mockResolve = resolve as jest.MockedFunction<typeof resolve>;
	const mockJoin = join as jest.MockedFunction<typeof join>;
	const originalCwd = process.cwd;

	beforeEach(() => {
		jest.clearAllMocks();
		process.cwd = jest.fn();
	});

	afterEach(() => {
		process.cwd = originalCwd;
	});

	describe("pathType: 'locales'", () => {
		describe("Поиск через dirname", () => {
			it("должен вернуть путь к src/locales когда src найден через dirname в dev режиме", () => {
				const options: GetServicePathOptions = {
					serviceName: "test-service",
					dirname: "/service/src/configs",
					pathType: "locales",
					relativePath: "locales",
				};
				const localesPath = "/service/src/locales";

				// Первая итерация: проверяем /service/src/configs/src (не существует)
				mockJoin.mockReturnValueOnce("/service/src/configs/src");
				mockExistsSync.mockReturnValueOnce(false);
				// Переходим к родителю
				mockResolve.mockReturnValueOnce("/service/src");
				// Вторая итерация: проверяем /service/src/src (не существует)
				mockJoin.mockReturnValueOnce("/service/src/src");
				mockExistsSync.mockReturnValueOnce(false);
				// Переходим к родителю
				mockResolve.mockReturnValueOnce("/service");
				// Третья итерация: проверяем /service/src (существует!)
				mockJoin.mockReturnValueOnce("/service/src").mockReturnValueOnce(localesPath);
				mockExistsSync.mockReturnValueOnce(true);

				const result = getServicePath(options);

				expect(mockJoin).toHaveBeenCalledWith("/service", "src", "locales");
				expect(result).toBe(localesPath);
			});

			it("должен вернуть путь к src/locales когда src найден через dirname в production режиме", () => {
				const options: GetServicePathOptions = {
					serviceName: "test-service",
					dirname: "/service/dist/configs",
					pathType: "locales",
					relativePath: "locales",
				};
				const serviceRoot = "/service";
				const localesPath = "/service/src/locales";

				// Первая итерация - проверяем dist/configs/src (не существует)
				mockJoin.mockReturnValueOnce("/service/dist/configs/src");
				mockExistsSync.mockReturnValueOnce(false);
				mockResolve.mockReturnValueOnce("/service/dist");
				// Вторая итерация - проверяем dist/src (не существует)
				mockJoin.mockReturnValueOnce("/service/dist/src");
				mockExistsSync.mockReturnValueOnce(false);
				mockResolve.mockReturnValueOnce("/service");
				// Третья итерация - проверяем src (существует!)
				mockJoin.mockReturnValueOnce("/service/src").mockReturnValueOnce(localesPath);
				mockExistsSync.mockReturnValueOnce(true);

				const result = getServicePath(options);

				expect(mockJoin).toHaveBeenCalledWith(serviceRoot, "src", "locales");
				expect(result).toBe(localesPath);
			});

			it("должен удалить префикс src/ из relativePath если он присутствует", () => {
				const options: GetServicePathOptions = {
					serviceName: "test-service",
					dirname: "/service/src/configs",
					pathType: "locales",
					relativePath: "src/locales",
				};
				const serviceRoot = "/service";
				const localesPath = "/service/src/locales";

				// Поиск корня сервиса
				mockJoin.mockReturnValueOnce("/service/src/configs/src");
				mockExistsSync.mockReturnValueOnce(false);
				mockResolve.mockReturnValueOnce("/service/src");
				mockJoin.mockReturnValueOnce("/service/src/src");
				mockExistsSync.mockReturnValueOnce(false);
				mockResolve.mockReturnValueOnce("/service");
				mockJoin.mockReturnValueOnce("/service/src").mockReturnValueOnce(localesPath);
				mockExistsSync.mockReturnValueOnce(true);

				const result = getServicePath(options);

				expect(mockJoin).toHaveBeenCalledWith(serviceRoot, "src", "locales");
				expect(result).toBe(localesPath);
			});
		});

		describe("Поиск через process.cwd()", () => {
			it("должен вернуть путь к src/locales из process.cwd() когда dirname не нашел src", () => {
				const options: GetServicePathOptions = {
					serviceName: "test-service",
					dirname: "/some/path/configs",
					pathType: "locales",
					relativePath: "locales",
				};
				const cwdRoot = "/service";
				const localesPath = "/service/src/locales";

				(process.cwd as jest.Mock).mockReturnValue(cwdRoot);

				// Поиск через dirname - не находит (достигаем корня файловой системы)
				mockJoin.mockReturnValueOnce("/some/path/configs/src");
				mockExistsSync.mockReturnValueOnce(false);
				mockResolve.mockReturnValueOnce("/some/path");
				mockJoin.mockReturnValueOnce("/some/path/src");
				mockExistsSync.mockReturnValueOnce(false);
				mockResolve.mockReturnValueOnce("/some");
				mockJoin.mockReturnValueOnce("/some/src");
				mockExistsSync.mockReturnValueOnce(false);
				mockResolve.mockReturnValueOnce("/");
				mockJoin.mockReturnValueOnce("/src");
				mockExistsSync.mockReturnValueOnce(false);
				mockResolve.mockReturnValueOnce("/"); // Достигли корня
				// Поиск через process.cwd() - находит
				mockJoin.mockReturnValueOnce("/service/src").mockReturnValueOnce(localesPath);
				mockExistsSync.mockReturnValueOnce(true);

				const result = getServicePath(options);

				expect(process.cwd).toHaveBeenCalled();
				expect(mockJoin).toHaveBeenCalledWith(cwdRoot, "src");
				expect(mockJoin).toHaveBeenCalledWith(cwdRoot, "src", "locales");
				expect(result).toBe(localesPath);
			});
		});

		describe("Поиск через корень репозитория", () => {
			it("должен вернуть путь к src/locales из корня репозитория когда предыдущие варианты не найдены", () => {
				const options: GetServicePathOptions = {
					serviceName: "test-service",
					dirname: "/some/path/configs",
					pathType: "locales",
					relativePath: "locales",
				};
				const cwdRoot = "/repo";
				const repoRoot = "/repo/services/test-service";
				const localesPath = "/repo/services/test-service/src/locales";

				(process.cwd as jest.Mock).mockReturnValue(cwdRoot);

				// Поиск через dirname - не находит (достигаем корня файловой системы)
				mockJoin.mockReturnValueOnce("/some/path/configs/src");
				mockExistsSync.mockReturnValueOnce(false);
				mockResolve.mockReturnValueOnce("/some/path");
				mockJoin.mockReturnValueOnce("/some/path/src");
				mockExistsSync.mockReturnValueOnce(false);
				mockResolve.mockReturnValueOnce("/some");
				mockJoin.mockReturnValueOnce("/some/src");
				mockExistsSync.mockReturnValueOnce(false);
				mockResolve.mockReturnValueOnce("/");
				mockJoin.mockReturnValueOnce("/src");
				mockExistsSync.mockReturnValueOnce(false);
				mockResolve.mockReturnValueOnce("/"); // Достигли корня
				// Поиск через process.cwd() - не находит
				mockJoin.mockReturnValueOnce("/repo/src");
				mockExistsSync.mockReturnValueOnce(false);
				// Поиск через корень репозитория - находит
				mockResolve.mockReturnValueOnce(repoRoot);
				mockJoin
					.mockReturnValueOnce("/repo/services/test-service/src")
					.mockReturnValueOnce(localesPath);
				mockExistsSync.mockReturnValueOnce(true);

				const result = getServicePath(options);

				expect(process.cwd).toHaveBeenCalledTimes(2);
				expect(mockResolve).toHaveBeenCalledWith(cwdRoot, "services", "test-service");
				expect(mockJoin).toHaveBeenCalledWith(repoRoot, "src");
				expect(mockJoin).toHaveBeenCalledWith(repoRoot, "src", "locales");
				expect(result).toBe(localesPath);
			});
		});

		describe("Ошибка при отсутствии корня сервиса", () => {
			it("должен выбросить ошибку когда корень сервиса не найден", () => {
				const options: GetServicePathOptions = {
					serviceName: "test-service",
					dirname: "/some/path/configs",
					pathType: "locales",
					relativePath: "locales",
				};
				const cwdRoot = "/repo";

				(process.cwd as jest.Mock).mockReturnValue(cwdRoot);

				// Все попытки поиска не находят src
				mockResolve.mockReturnValue("/some/path");
				mockJoin.mockReturnValue("/some/path/configs/src");
				mockExistsSync.mockReturnValue(false);
				mockResolve.mockReturnValue("/some");
				mockJoin.mockReturnValue("/some/path/src");
				mockExistsSync.mockReturnValue(false);
				mockResolve.mockReturnValue("/");
				mockJoin.mockReturnValue("/some/src");
				mockExistsSync.mockReturnValue(false);
				// process.cwd() не находит
				mockJoin.mockReturnValue("/repo/src");
				mockExistsSync.mockReturnValue(false);
				// Корень репозитория не находит
				mockResolve.mockReturnValue("/repo/services/test-service");
				mockJoin.mockReturnValue("/repo/services/test-service/src");
				mockExistsSync.mockReturnValue(false);

				expect(() => getServicePath(options)).toThrow(
					'Не удалось найти корень сервиса "test-service". Проверьте, что папка src существует в сервисе или запустите из корня сервиса.'
				);
			});
		});
	});

	describe("pathType: 'srcRoot'", () => {
		it("должен вернуть корень сервиса когда src найден через dirname", () => {
			const options: GetServicePathOptions = {
				serviceName: "test-service",
				dirname: "/service/src/configs",
				pathType: "srcRoot",
				relativePath: "src",
			};
			const serviceRoot = "/service";

			// Поиск корня сервиса
			mockJoin.mockReturnValueOnce("/service/src/configs/src");
			mockExistsSync.mockReturnValueOnce(false);
			mockResolve.mockReturnValueOnce("/service/src");
			mockJoin.mockReturnValueOnce("/service/src/src");
			mockExistsSync.mockReturnValueOnce(false);
			mockResolve.mockReturnValueOnce("/service");
			mockJoin.mockReturnValueOnce("/service/src");
			mockExistsSync.mockReturnValueOnce(true);

			const result = getServicePath(options);

			expect(result).toBe(serviceRoot);
		});

		it("должен вернуть корень сервиса из process.cwd() когда dirname не нашел src", () => {
			const options: GetServicePathOptions = {
				serviceName: "test-service",
				dirname: "/some/path/configs",
				pathType: "srcRoot",
				relativePath: "src",
			};
			const cwdRoot = "/service";

			(process.cwd as jest.Mock).mockReturnValue(cwdRoot);

			// Поиск через dirname - не находит (достигаем корня файловой системы)
			mockJoin.mockReturnValueOnce("/some/path/configs/src");
			mockExistsSync.mockReturnValueOnce(false);
			mockResolve.mockReturnValueOnce("/some/path");
			mockJoin.mockReturnValueOnce("/some/path/src");
			mockExistsSync.mockReturnValueOnce(false);
			mockResolve.mockReturnValueOnce("/some");
			mockJoin.mockReturnValueOnce("/some/src");
			mockExistsSync.mockReturnValueOnce(false);
			mockResolve.mockReturnValueOnce("/");
			mockJoin.mockReturnValueOnce("/src");
			mockExistsSync.mockReturnValueOnce(false);
			mockResolve.mockReturnValueOnce("/"); // Достигли корня
			// Поиск через process.cwd() - находит
			mockJoin.mockReturnValueOnce("/service/src");
			mockExistsSync.mockReturnValueOnce(true);

			const result = getServicePath(options);

			expect(result).toBe(cwdRoot);
		});
	});

	describe("pathType: 'file'", () => {
		it("должен вернуть путь к файлу в src когда файл найден через dirname", () => {
			const options: GetServicePathOptions = {
				serviceName: "test-service",
				dirname: "/service/src/chat/workers",
				pathType: "file",
				relativePath: "chat/workers/ai-sdk.worker.ts",
			};
			const serviceRoot = "/service";
			const filePath = "/service/src/chat/workers/ai-sdk.worker.ts";

			// Поиск корня сервиса
			mockJoin.mockReturnValueOnce("/service/src/chat/workers/src");
			mockExistsSync.mockReturnValueOnce(false);
			mockResolve.mockReturnValueOnce("/service/src/chat");
			mockJoin.mockReturnValueOnce("/service/src/chat/src");
			mockExistsSync.mockReturnValueOnce(false);
			mockResolve.mockReturnValueOnce("/service/src");
			mockJoin.mockReturnValueOnce("/service/src/src");
			mockExistsSync.mockReturnValueOnce(false);
			mockResolve.mockReturnValueOnce("/service");
			mockJoin.mockReturnValueOnce("/service/src").mockReturnValueOnce(filePath);
			mockExistsSync.mockReturnValueOnce(true);

			const result = getServicePath(options);

			expect(mockJoin).toHaveBeenCalledWith(serviceRoot, "src", "chat/workers/ai-sdk.worker.ts");
			expect(result).toBe(filePath);
		});

		it("должен удалить префикс src/ из relativePath если он присутствует", () => {
			const options: GetServicePathOptions = {
				serviceName: "test-service",
				dirname: "/service/src/chat/workers",
				pathType: "file",
				relativePath: "src/chat/workers/ai-sdk.worker.ts",
			};
			const serviceRoot = "/service";
			const filePath = "/service/src/chat/workers/ai-sdk.worker.ts";

			// Поиск корня сервиса
			mockJoin.mockReturnValueOnce("/service/src/chat/workers/src");
			mockExistsSync.mockReturnValueOnce(false);
			mockResolve.mockReturnValueOnce("/service/src/chat");
			mockJoin.mockReturnValueOnce("/service/src/chat/src");
			mockExistsSync.mockReturnValueOnce(false);
			mockResolve.mockReturnValueOnce("/service/src");
			mockJoin.mockReturnValueOnce("/service/src/src");
			mockExistsSync.mockReturnValueOnce(false);
			mockResolve.mockReturnValueOnce("/service");
			mockJoin.mockReturnValueOnce("/service/src").mockReturnValueOnce(filePath);
			mockExistsSync.mockReturnValueOnce(true);

			const result = getServicePath(options);

			expect(mockJoin).toHaveBeenCalledWith(serviceRoot, "src", "chat/workers/ai-sdk.worker.ts");
			expect(result).toBe(filePath);
		});

		it("должен вернуть путь к файлу в src когда запущен из production (dist)", () => {
			const options: GetServicePathOptions = {
				serviceName: "test-service",
				dirname: "/service/dist/chat/workers",
				pathType: "file",
				relativePath: "chat/workers/ai-sdk.worker.ts",
			};
			const serviceRoot = "/service";
			const filePath = "/service/src/chat/workers/ai-sdk.worker.ts";

			// Поиск через dirname - находит на третьей итерации
			mockJoin.mockReturnValueOnce("/service/dist/chat/workers/src");
			mockExistsSync.mockReturnValueOnce(false);
			mockResolve.mockReturnValueOnce("/service/dist/chat");
			mockJoin.mockReturnValueOnce("/service/dist/chat/src");
			mockExistsSync.mockReturnValueOnce(false);
			mockResolve.mockReturnValueOnce("/service/dist");
			mockJoin.mockReturnValueOnce("/service/dist/src");
			mockExistsSync.mockReturnValueOnce(false);
			mockResolve.mockReturnValueOnce("/service");
			mockJoin.mockReturnValueOnce("/service/src").mockReturnValueOnce(filePath);
			mockExistsSync.mockReturnValueOnce(true);

			const result = getServicePath(options);

			expect(mockJoin).toHaveBeenCalledWith(serviceRoot, "src", "chat/workers/ai-sdk.worker.ts");
			expect(result).toBe(filePath);
		});
	});

	describe("Граничные случаи", () => {
		it("должен корректно обрабатывать достижение корня файловой системы", () => {
			const options: GetServicePathOptions = {
				serviceName: "test-service",
				dirname: "/some/path/configs",
				pathType: "locales",
				relativePath: "locales",
			};
			const cwdRoot = "/service";
			const cwdSrcPath = "/service/src";
			const localesPath = "/service/src/locales";

			(process.cwd as jest.Mock).mockReturnValue(cwdRoot);

			// Поиск через dirname - доходит до корня файловой системы
			mockResolve.mockReturnValueOnce("/some/path");
			mockJoin.mockReturnValueOnce("/some/path/configs/src");
			mockExistsSync.mockReturnValueOnce(false);
			mockResolve.mockReturnValueOnce("/some");
			mockJoin.mockReturnValueOnce("/some/path/src");
			mockExistsSync.mockReturnValueOnce(false);
			mockResolve.mockReturnValueOnce("/");
			mockJoin.mockReturnValueOnce("/some/src");
			mockExistsSync.mockReturnValueOnce(false);
			// Следующая итерация вернет тот же путь (корень файловой системы)
			mockResolve.mockReturnValueOnce("/");
			// Поиск через process.cwd() - находит
			mockJoin.mockReturnValueOnce(cwdSrcPath).mockReturnValueOnce(localesPath);
			mockExistsSync.mockReturnValueOnce(true);

			const result = getServicePath(options);

			expect(result).toBe(localesPath);
		});

		it("должен корректно обрабатывать maxDepth защиту от бесконечного цикла", () => {
			const options: GetServicePathOptions = {
				serviceName: "test-service",
				dirname: "/some/path/configs",
				pathType: "locales",
				relativePath: "locales",
			};
			const cwdRoot = "/service";
			const cwdSrcPath = "/service/src";
			const localesPath = "/service/src/locales";

			(process.cwd as jest.Mock).mockReturnValue(cwdRoot);

			// Мокируем 10 итераций поиска через dirname (maxDepth)
			for (let i = 0; i < 10; i++) {
				mockResolve.mockReturnValueOnce(`/path${i}`);
				mockJoin.mockReturnValueOnce(`/path${i}/src`);
				mockExistsSync.mockReturnValueOnce(false);
			}
			// Поиск через process.cwd() - находит
			mockJoin.mockReturnValueOnce(cwdSrcPath).mockReturnValueOnce(localesPath);
			mockExistsSync.mockReturnValueOnce(true);

			const result = getServicePath(options);

			expect(result).toBe(localesPath);
		});
	});
});
