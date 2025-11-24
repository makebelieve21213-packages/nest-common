import { SetMetadata } from "@nestjs/common";

// Ключ метаданных для разрешений
export const PERMISSIONS_KEY = "permissions";

// Декоратор для указания разрешений, необходимых для доступа к эндпоинту
export const Permissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);
