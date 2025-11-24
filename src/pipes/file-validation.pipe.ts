import { ArgumentMetadata, Injectable, PipeTransform, BadRequestException } from "@nestjs/common";
import { validateFile } from "src/utils/file.utils";

import type { MulterFile } from "src/types/file-types";
import type { FileValidationOptions } from "src/types/file-validation-types";

// Pipe для валидации загруженных файлов
@Injectable()
export default class FileValidationPipe implements PipeTransform {
	constructor(private readonly options: FileValidationOptions = {}) {}

	transform(
		value: MulterFile | MulterFile[],
		_metadata: ArgumentMetadata
	): MulterFile | MulterFile[] {
		if (!value) {
			throw new BadRequestException("No file provided");
		}

		if (Array.isArray(value)) {
			// Валидируем каждый файл в массиве
			return value.map((file) => this.validateSingleFile(file));
		}

		return this.validateSingleFile(value);
	}

	private validateSingleFile(file: MulterFile): MulterFile {
		const result = validateFile(file, this.options);

		if (!result.isValid) {
			throw new BadRequestException(`File validation failed: ${result.errors.join("; ")}`);
		}

		return file;
	}
}
