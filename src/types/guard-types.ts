// Интерфейс для хранения информации о лимитах
export interface RateLimitInfo {
	count: number;
	resetTime: number;
}
