import { VersioningType } from "@nestjs/common";

import type { VersioningOptions } from "@nestjs/common/interfaces/version-options.interface";
import type { VersioningOptionsConfig } from "src/types/versioning-types";

// Создает опции версионирования для NestJS приложения
export default function createVersioningOptions(
	config: VersioningOptionsConfig
): VersioningOptions {
	const { type, defaultVersion, header = "X-API-Version", key = "v" } = config;

	if (type === "header") {
		return {
			type: VersioningType.HEADER,
			header,
			defaultVersion,
		};
	}

	if (type === "uri") {
		return {
			type: VersioningType.URI,
			defaultVersion,
		};
	}

	if (type === "media-type") {
		return {
			type: VersioningType.MEDIA_TYPE,
			key,
			defaultVersion,
		};
	}

	return {
		type: VersioningType.URI,
		defaultVersion,
	};
}
