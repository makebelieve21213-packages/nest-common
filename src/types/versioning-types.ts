// Тип стратегии версионирования
export type VersioningStrategy = "uri" | "header" | "media-type";

// Опции для настройки версионирования API
export interface VersioningOptionsConfig {
	type: VersioningStrategy;
	defaultVersion?: string;
	header?: string;
	key?: string;
}
