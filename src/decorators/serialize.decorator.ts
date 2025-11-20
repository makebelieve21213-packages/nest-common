import { SetMetadata } from "@nestjs/common";

// Ключ метаданных для сериализации
export const SERIALIZE_KEY = "serialize";

// Декоратор для указания класса DTO для сериализации ответа
export const Serialize = (dto: unknown) => SetMetadata(SERIALIZE_KEY, dto);
