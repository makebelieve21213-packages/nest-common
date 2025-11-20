import { SetMetadata } from "@nestjs/common";
import { ApiKey, API_KEY_KEY } from "src/decorators/api-key.decorator";

jest.mock("@nestjs/common", () => {
	const actual = jest.requireActual("@nestjs/common");
	return {
		...actual,
		SetMetadata: jest.fn().mockReturnValue(() => {}),
	};
});

describe("ApiKey decorator", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("should set metadata with API_KEY_KEY", () => {
		ApiKey();

		expect(SetMetadata).toHaveBeenCalledWith(API_KEY_KEY, true);
	});

	it("should return SetMetadata result", () => {
		// SetMetadata вызывается при вызове декоратора
		ApiKey();
		// Проверяем, что SetMetadata был вызван (проверено в предыдущем тесте)
		expect(SetMetadata).toHaveBeenCalled();
	});
});
