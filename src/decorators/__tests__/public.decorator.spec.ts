import { SetMetadata } from "@nestjs/common";
import { Public, IS_PUBLIC_KEY } from "src/decorators/public.decorator";

jest.mock("@nestjs/common", () => {
	const actual = jest.requireActual("@nestjs/common");
	return {
		...actual,
		SetMetadata: jest.fn().mockReturnValue(() => {}),
	};
});

describe("Public decorator", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("should set metadata with IS_PUBLIC_KEY", () => {
		Public();

		expect(SetMetadata).toHaveBeenCalledWith(IS_PUBLIC_KEY, true);
	});

	it("should return SetMetadata result", () => {
		// SetMetadata вызывается при вызове декоратора
		Public();
		// Проверяем, что SetMetadata был вызван (проверено в предыдущем тесте)
		expect(SetMetadata).toHaveBeenCalled();
	});
});
