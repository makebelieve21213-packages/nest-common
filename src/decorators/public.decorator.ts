import { SetMetadata } from "@nestjs/common";

// Ключ метаданных для публичных эндпоинтов
export const IS_PUBLIC_KEY = "isPublic";

// Декоратор для пометки эндпоинта как публичного (без аутентификации)
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
