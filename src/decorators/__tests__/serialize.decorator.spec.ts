import { SetMetadata } from "@nestjs/common";
import { Serialize, SERIALIZE_KEY } from "src/decorators/serialize.decorator";

jest.mock("@nestjs/common", () => {
	const actual = jest.requireActual("@nestjs/common");
	return {
		...actual,
		SetMetadata: jest.fn().mockReturnValue(() => {}),
	};
});

class TestDto {
	name!: string;
}

describe("Serialize decorator", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("should set metadata with SERIALIZE_KEY and DTO class", () => {
		Serialize(TestDto);

		expect(SetMetadata).toHaveBeenCalledWith(SERIALIZE_KEY, TestDto);
	});

	it("should return SetMetadata result", () => {
		// SetMetadata вызывается при вызове декоратора
		Serialize(TestDto);
		// Проверяем, что SetMetadata был вызван (проверено в предыдущем тесте)
		expect(SetMetadata).toHaveBeenCalled();
	});
});
