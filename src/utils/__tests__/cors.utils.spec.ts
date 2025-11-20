import createCorsOptions from "src/utils/cors.utils";

describe("cors.utils", () => {
	describe("createCorsOptions", () => {
		it("should create default CORS options", () => {
			const options = createCorsOptions();

			expect(options).toEqual({
				origin: true,
				methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
				allowedHeaders: [
					"Content-Type",
					"Authorization",
					"X-Requested-With",
					"X-Request-ID",
					"X-API-Key",
				],
				exposedHeaders: ["X-Request-ID"],
				credentials: true,
				maxAge: 86400,
				preflightContinue: false,
				optionsSuccessStatus: 204,
			});
		});

		it("should create CORS options with custom config", () => {
			const options = createCorsOptions({
				origin: "https://example.com",
				methods: ["GET", "POST"],
				allowedHeaders: ["Authorization"],
				credentials: false,
				maxAge: 3600,
			});

			expect(options).toEqual({
				origin: "https://example.com",
				methods: ["GET", "POST"],
				allowedHeaders: ["Authorization"],
				exposedHeaders: ["X-Request-ID"],
				credentials: false,
				maxAge: 3600,
				preflightContinue: false,
				optionsSuccessStatus: 204,
			});
		});

		it("should handle function origin", () => {
			const originFn = (origin: string) => origin.includes("example.com");
			const options = createCorsOptions({ origin: originFn });

			expect(options.origin).toBe(originFn);
		});

		it("should handle array origin", () => {
			const origins = ["https://example.com", "https://test.com"];
			const options = createCorsOptions({ origin: origins });

			expect(options.origin).toEqual(origins);
		});
	});
});
