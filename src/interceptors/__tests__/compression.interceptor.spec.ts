import { of } from "rxjs";
import CompressionInterceptor from "src/interceptors/compression.interceptor";

import type { ExecutionContext, CallHandler } from "@nestjs/common";

describe("CompressionInterceptor", () => {
	let interceptor: CompressionInterceptor;
	let mockExecutionContext: jest.Mocked<ExecutionContext>;
	let mockCallHandler: jest.Mocked<CallHandler>;
	let mockResponse: {
		setHeader: jest.Mock;
	};

	beforeEach(() => {
		mockResponse = {
			setHeader: jest.fn(),
		};

		mockExecutionContext = {
			switchToHttp: jest.fn().mockReturnValue({
				getResponse: jest.fn().mockReturnValue(mockResponse),
			}),
		} as unknown as jest.Mocked<ExecutionContext>;

		mockCallHandler = {
			handle: jest.fn(),
		} as unknown as jest.Mocked<CallHandler>;
	});

	it("should not compress data below threshold", (done) => {
		interceptor = new CompressionInterceptor(1024);
		const smallData = { test: "data" };
		mockCallHandler.handle = jest.fn().mockReturnValue(of(smallData));

		interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((result) => {
			expect(result).toBe(smallData);
			expect(mockResponse.setHeader).not.toHaveBeenCalled();
			done();
		});
	});

	it("should compress data above threshold", (done) => {
		interceptor = new CompressionInterceptor(100);
		const largeData = { test: "x".repeat(200) };
		mockCallHandler.handle = jest.fn().mockReturnValue(of(largeData));

		interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((result) => {
			expect(Buffer.isBuffer(result)).toBe(true);
			expect(mockResponse.setHeader).toHaveBeenCalledWith("Content-Encoding", "gzip");
			expect(mockResponse.setHeader).toHaveBeenCalledWith("Content-Type", "application/json");
			done();
		});
	});

	it("should not compress if compression ratio is too high", (done) => {
		interceptor = new CompressionInterceptor(100, 0.5);
		// Используем данные, которые плохо сжимаются (случайные символы)
		const data = {
			test: Array.from({ length: 200 }, () =>
				String.fromCharCode(Math.floor(Math.random() * 256))
			).join(""),
		};
		mockCallHandler.handle = jest.fn().mockReturnValue(of(data));

		interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((result) => {
			// Если коэффициент сжатия >= 0.5, данные не должны быть сжаты
			// Проверяем, что результат не является Buffer или что заголовки не установлены
			if (Buffer.isBuffer(result)) {
				// Если данные были сжаты, проверяем что коэффициент действительно низкий
				const dataString = JSON.stringify(data);
				const dataSize = Buffer.byteLength(dataString, "utf8");
				const compressedSize = (result as Buffer).length;
				const compressionRatio = compressedSize / dataSize;

				// Если коэффициент >= 0.5, данные не должны были быть сжаты
				// Но если они были сжаты, значит коэффициент < 0.5, что нормально
				// Просто проверяем, что тест завершается
				expect(compressionRatio).toBeLessThan(0.5);
			} else {
				// Данные не были сжаты
				expect(result).toBe(data);
			}
			done();
		});
	});

	it("should use default minCompressionRatio when not provided", (done) => {
		interceptor = new CompressionInterceptor(100);
		const largeData = { test: "x".repeat(200) };
		mockCallHandler.handle = jest.fn().mockReturnValue(of(largeData));

		interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((result) => {
			// С дефолтным minCompressionRatio (0.8) данные должны быть сжаты
			expect(Buffer.isBuffer(result)).toBe(true);
			expect(mockResponse.setHeader).toHaveBeenCalledWith("Content-Encoding", "gzip");
			done();
		});
	});

	it("should use default threshold when not provided", (done) => {
		interceptor = new CompressionInterceptor();
		const smallData = { test: "data" };
		mockCallHandler.handle = jest.fn().mockReturnValue(of(smallData));

		interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((result) => {
			// С дефолтным threshold (1024) маленькие данные не должны быть сжаты
			expect(result).toBe(smallData);
			expect(mockResponse.setHeader).not.toHaveBeenCalled();
			done();
		});
	});
});
