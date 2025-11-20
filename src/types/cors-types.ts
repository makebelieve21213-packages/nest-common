// Опции для настройки CORS
export interface CorsOptionsConfig {
	origin?: string | string[] | boolean | RegExp | ((origin: string) => boolean);
	methods?: string | string[];
	allowedHeaders?: string | string[];
	exposedHeaders?: string | string[];
	credentials?: boolean;
	maxAge?: number;
	preflightContinue?: boolean;
	optionsSuccessStatus?: number;
}
