import { SetMetadata } from "@nestjs/common";

// Ключ метаданных для API ключей
export const API_KEY_KEY = "apiKey";

// Декоратор для пометки эндпоинта как требующего API ключ
export const ApiKey = () => SetMetadata(API_KEY_KEY, true);
