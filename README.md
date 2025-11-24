# @makebelieve21213-packages/nest-common

Общий пакет с утилитами для NestJS микросервисов. Предоставляет единую систему обработки ошибок, валидации, логирования и базовые классы для HTTP, RPC и WebSocket контекстов.

## 📋 Содержание

- [Возможности](#-возможности)
- [Требования](#-требования)
- [Установка](#-установка)
- [Быстрый старт](#-быстрый-старт)
- [Система обработки ошибок](#-система-обработки-ошибок)
- [API Reference](#-api-reference)
- [Best Practices](#-best-practices)
- [Тестирование](#-тестирование)
- [Разработка](#-разработка)

## 🚀 Возможности

- ✅ **Единая система обработки ошибок** - автоматическое преобразование ошибок между HTTP, RPC и WebSocket контекстами
- ✅ **Глобальные фильтры** - автоматическая обработка всех ошибок без try-catch в контроллерах
- ✅ **Валидация** - готовые пайпы для валидации DTO, файлов, query параметров и заголовков
- ✅ **Логирование** - автоматическое логирование всех HTTP, RPC и WebSocket запросов
- ✅ **Guards** - готовые guards для аутентификации, авторизации и rate limiting
- ✅ **Декораторы** - удобные декораторы для метаданных (@Public, @Roles, @Permissions, @ApiKey, @Serialize)
- ✅ **Утилиты** - функции для работы с контекстом, файлами, CORS, compression, versioning
- ✅ **100% покрытие тестами** - надежность и качество кода
- ✅ **TypeScript типизация** - полная типобезопасность

## 📋 Требования

- **Node.js**: >= 22.11.0
- **npm**: >= 10.0.0
- **NestJS**: >= 11.0.0

## 📦 Установка

```bash
npm install @makebelieve21213-packages/nest-common
```

## 🔧 Быстрый старт

### Шаг 1: Регистрация глобальных фильтров и перехватчиков

```typescript
// main.ts
import { NestFactory } from "@nestjs/core";
import { UnifiedExceptionFilter, UnifiedInterceptor } from "@makebelieve21213-packages/nest-common";
import { LoggerService } from "@makebelieve21213-packages/logger";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const logger = await connectLogger(app, "ServiceName");
    
    // Регистрируем глобальный фильтр ошибок
    app.useGlobalFilters(new UnifiedExceptionFilter(logger, dlxExchange)); // dlxExchange опционально
    
    // Регистрируем глобальный перехватчик логирования
    app.useGlobalInterceptors(new UnifiedInterceptor(logger));
    
    await app.listen(3000);
}
```

### Шаг 2: HTTP контроллер

```typescript
import { Controller, Get } from "@nestjs/common";
import { BaseController } from "@makebelieve21213-packages/nest-common";
import { LoggerService } from "@makebelieve21213-packages/logger";

@Controller("test")
export default class TestController extends BaseController {
    constructor(
        private readonly testService: TestService,
        logger: LoggerService,
    ) {
        super(logger);
    }

    @Get("data")
    async getData() {
        // БЕЗ try-catch - глобальный фильтр все обработает
        return await this.testService.getData();
    }
}
```

### Шаг 3: RPC контроллер

```typescript
import { Controller } from "@nestjs/common";
import { MessagePattern, Payload, Ctx } from "@nestjs/microservices";
import { BaseController, RpcValidationPipe } from "@makebelieve21213-packages/nest-common";
import { LoggerService } from "@makebelieve21213-packages/logger";

@Controller()
export default class TestController extends BaseController {
    constructor(
        private readonly testService: TestService,
        logger: LoggerService,
    ) {
        super(logger);
    }

    @MessagePattern("test.pattern")
    @UsePipes(new RpcValidationPipe(TestRequestDto))
    async getData(
        @Payload() dto: TestRequestDto,
        @Ctx() ctx: RmqContext,
    ): Promise<TestResponseDto> {
        const data = await this.testService.getData();
        this.acknowledge(ctx);
        return data;
    }
}
```

### Шаг 4: Использование Guards

```typescript
import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard, RolesGuard, Roles, Public } from "@makebelieve21213-packages/nest-common";

@Controller("test")
@UseGuards(JwtAuthGuard, RolesGuard)
export default class TestController extends BaseController {
    @Get("public")
    @Public() // Публичный эндпоинт
    async getPublicInfo() {
        return { message: "Public information" };
    }

    @Get("profile")
    async getProfile(@Request() req) {
        return await this.testService.getProfile(req.user);
    }

    @Get("admin")
    @Roles("admin", "moderator") // Требуются роли
    async getAdminData() {
        return await this.testService.getData();
    }
}
```

## 🔄 Система обработки ошибок

Пакет предоставляет единую систему обработки ошибок для трех типов контекстов:
- **HTTP** - для HTTP контроллеров
- **RPC** - для RabbitMQ RPC запросов
- **WebSocket** - для Socket.io соединений

Все ошибки автоматически преобразуются между контекстами с сохранением типа и статус-кода.

### Принципы работы

1. **Глобальные фильтры** - все ошибки обрабатываются автоматически через `UnifiedExceptionFilter`
2. **Без catch блоков в контроллерах** - контроллеры не должны иметь try-catch блоков
3. **Автоматическое преобразование** - ошибки автоматически преобразуются между контекстами
4. **Сохранение типа и статуса** - тип ошибки и статус-код сохраняются при преобразовании

### Классы ошибок

**HttpError** - для HTTP контекста
- Автоматически преобразует `RpcException`/`RpcError` в HTTP ошибку
- Сохраняет правильный HTTP статус-код
- Метод: `HttpError.fromUnknown(error, descriptionPrefix?)`

**RpcError** - для RabbitMQ RPC контекста
- Автоматически определяет тип ошибки (временная/постоянная)
- Используется в `RpcExceptionFilter` для retry/DLX логики
- Метод: `RpcError.fromUnknown(error)`
- Метод: `isTransient(): boolean`

**SocketError** - для WebSocket контекста
- Используется для обработки ошибок при отправке событий через Socket.io
- Метод: `SocketError.fromUnknown(error)`

**JsonRpcException** - для JSON-RPC 2.0 протокола
- Поддерживает стандартные коды ошибок JSON-RPC 2.0
- Автоматически маппит HTTP статусы на JSON-RPC коды ошибок

## 📚 API Reference

### Фильтры

**UnifiedExceptionFilter** - единый глобальный фильтр для обработки HTTP и RPC ошибок
```typescript
app.useGlobalFilters(new UnifiedExceptionFilter(logger, dlxExchange));
```

**JsonRpcExceptionFilter** - фильтр для обработки JSON-RPC 2.0 ошибок
```typescript
@UseFilters(JsonRpcExceptionFilter)
```

### Перехватчики

**UnifiedInterceptor** - единый глобальный перехватчик для логирования запросов
```typescript
app.useGlobalInterceptors(new UnifiedInterceptor(logger));
```

**ResponseInterceptor** - стандартизация формата HTTP ответов
```typescript
@UseInterceptors(ResponseInterceptor)
```

**SerializeInterceptor** - сериализация ответов с исключением чувствительных данных
```typescript
@UseInterceptors(SerializeInterceptor)
@Serialize(UserResponseDto)
```

**CompressionInterceptor** - автоматическое сжатие больших ответов
```typescript
@UseInterceptors(new CompressionInterceptor(2048, 0.7))
```

**RequestIdResponseInterceptor** - добавление Request ID в заголовки ответов
```typescript
@UseInterceptors(RequestIdResponseInterceptor)
```

### Пайпы валидации

**HttpValidationPipe** - валидация DTO для HTTP контроллеров
```typescript
@UsePipes(new HttpValidationPipe(CreateDto))
```

**RpcValidationPipe** - валидация DTO для RabbitMQ (автоматически извлекает correlationId и correlationTimestamp)
```typescript
@UsePipes(new RpcValidationPipe(TestRequestDto))
```

**JsonRpcValidationPipe** - валидация JSON-RPC 2.0 запросов
```typescript
@Body(JsonRpcValidationPipe) request: JsonRpcRequest
```

**FileValidationPipe** - валидация загруженных файлов
```typescript
@UploadedFile(new FileValidationPipe({ maxSize: 5 * 1024 * 1024 }))
```

**QueryValidationPipe** - валидация query параметров
```typescript
@Query(new QueryValidationPipe(PaginationDto)) query: PaginationDto
```

**HeaderValidationPipe** - валидация заголовков
```typescript
@Headers(new HeaderValidationPipe(ApiHeadersDto)) headers: ApiHeadersDto
```

### Guards

**JwtAuthGuard** - проверка JWT токена
```typescript
@UseGuards(JwtAuthGuard)
```

**ApiKeyGuard** - проверка API ключа (работает с декоратором `@ApiKey()`)
```typescript
@UseGuards(new ApiKeyGuard(undefined, "x-api-key", new Set(["key1", "key2"])))
@ApiKey()
```

**RolesGuard** - проверка ролей пользователя (работает с декоратором `@Roles()`)
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin", "moderator")
```

**PermissionsGuard** - проверка разрешений пользователя (работает с декоратором `@Permissions()`)
```typescript
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions("users:delete", "users:write")
```

**RateLimitGuard** - ограничение частоты запросов
```typescript
@UseGuards(new RateLimitGuard(undefined, 200, 60000)) // 200 запросов в минуту
```

**WebSocketAuthGuard** - проверка аутентификации WebSocket
```typescript
@UseGuards(new WebSocketAuthGuard(async (token, context) => {
    return await this.authService.validateToken(token);
}))
```

### Декораторы

- `@Public()` - пометка публичного эндпоинта
- `@Roles(...)` - указание требуемых ролей
- `@Permissions(...)` - указание требуемых разрешений
- `@ApiKey()` - пометка эндпоинта как требующего API ключ
- `@Serialize(DtoClass)` - указание DTO для сериализации ответа

### Утилиты

**validateEnv** - валидация переменных окружения с Joi
```typescript
const validatedEnv = validateEnv(env, ["DATABASE_URL", "REDIS_URL"]);
```

**getUserFromContext** - извлечение пользователя из контекста
```typescript
const user = getUserFromContext(context);
```

**getIpFromContext** - извлечение IP адреса из контекста
```typescript
const ip = getIpFromContext(context);
```

**getRequestIdFromContext** - извлечение Request ID из контекста
```typescript
const requestId = getRequestIdFromContext(context);
```

**createCorsOptions** - создание опций CORS
```typescript
app.enableCors(createCorsOptions({ origin: ["https://example.com"] }));
```

**createCompressionOptions** - создание опций compression
```typescript
app.use(compression(createCompressionOptions({ level: 9 })));
```

**createVersioningOptions** - создание опций версионирования
```typescript
app.enableVersioning(createVersioningOptions({ type: "uri", defaultVersion: "1" }));
```

**validateFile** - валидация файла
```typescript
const result = validateFile(file, { maxSize: 5 * 1024 * 1024 });
```

**CircuitBreakerService** - реализация паттерна Circuit Breaker
```typescript
const circuitBreaker = new CircuitBreakerService(logger, {
    failureThreshold: 5,
    successThreshold: 2,
    resetTimeout: 60000,
});
```

**getServicePath** - определение пути в сервисе
```typescript
const path = getServicePath({ serviceName: "test-service", dirname: __dirname, pathType: "locales", relativePath: "locales" });
```

### BaseController

Базовый контроллер для всех контроллеров проекта. Предоставляет метод `acknowledge(ctx: RmqContext)` для подтверждения RPC сообщений.

```typescript
export default class TestController extends BaseController {
    constructor(
        private readonly testService: TestService,
        logger: LoggerService,
    ) {
        super(logger);
    }
}
```

## ✅ Best Practices

### 1. Не используйте catch блоки в контроллерах

```typescript
// ❌ ПЛОХО
@Get("global")
async getGlobal() {
    try {
        return await this.service.getData();
    } catch (error) {
        // Обработка ошибок через try-catch не нужна
    }
}

// ✅ ХОРОШО
@Get("global")
async getGlobal() {
    // Глобальный фильтр все обработает
    return await this.service.getData();
}
```

### 2. Используйте catch блоки в сервисах только для логирования

```typescript
// ✅ ХОРОШО - дополнительное логирование
async getData() {
    try {
        return await this.externalService.call();
    } catch (error) {
        this.logger.error(`Дополнительное логирование: ${error}`);
        // Пробрасываем дальше - фильтр преобразует
        throw error;
    }
}
```

### 3. Не преобразуйте ошибки вручную в контроллерах

```typescript
// ❌ ПЛОХО
@Get("global")
async getGlobal() {
    try {
        return await this.service.getData();
    } catch (error) {
        const httpError = HttpError.fromUnknown(error);
        throw httpError;
    }
}

// ✅ ХОРОШО - фильтр сделает это автоматически
@Get("global")
async getGlobal() {
    return await this.service.getData();
}
```

### 4. Используйте правильный тип ошибки для контекста

```typescript
// HTTP контекст → HttpError (автоматически через UnifiedExceptionFilter)
// RPC контекст → RpcError (автоматически через UnifiedExceptionFilter)
// Socket контекст → SocketError (вручную в SocketGateway.publish())
```

### 5. Используйте валидацию через пайпы

```typescript
// ✅ ХОРОШО
@Post("create")
@UsePipes(new HttpValidationPipe(CreateDto))
async create(@Body() dto: CreateDto) {
    return await this.service.create(dto);
}
```

### 6. Используйте guards с соответствующими декораторами

```typescript
// ✅ ХОРОШО
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin", "moderator")
async getAdminData() {
    return await this.testService.getData();
}
```

## 🧪 Тестирование

Пакет имеет высокое покрытие тестами (>95% для веток, 100% для statements и функций).

```bash
# Запуск тестов
npm test

# Запуск тестов с покрытием
npm run test:coverage
```

**Покрытие тестами:**
- Statements: 100%
- Branches: 95.45%
- Functions: 100%
- Lines: 100%

## 🏗️ Разработка

### Технический стек

- **TypeScript 5.7+** - строгая типизация
- **ESM модули** - современный стандарт модулей JavaScript
- **NestJS 11.x** - фреймворк для микросервисов
- **Jest** - тестирование

### Процесс сборки

Пакет использует многоэтапную сборку для корректной работы ESM:
1. **TypeScript компиляция** (`tsc --build`) - компиляция TypeScript в JavaScript
2. **Замена алиасов** (`tsc-alias`) - замена путей `src/*` на относительные
3. **Исправление ESM** (`tsc-esm-fix`) - добавление `.js` расширений к импортам

```bash
# Установка зависимостей
npm install

# Сборка
npm run build

# Запуск тестов
npm test

# Запуск тестов с покрытием
npm run test:coverage

# Линтер
npm run lint
npm run lint:fix

# Форматирование
npm run format
npm run format:fix
```

### Git Hooks (Husky)

Пакет использует Husky для автоматической проверки кода:

- **pre-commit**: Автоматически исправляет линтер и форматирование перед коммитом
- **pre-push**: Запускает тесты с проверкой покрытия перед push

## 🐳 Развертывание в Docker

### Сборка образа

Соберите Docker образ из корня проекта:

```bash
docker build -t nest-common-package:latest .
```

### Запуск контейнера

```bash
docker run -d \
  --name nest-common-package \
  nest-common-package:latest
```

## Совместимость

- **Node.js**: >=22.11.0
- **npm**: >=10.0.0
- **@nestjs/common**: ^11.1.6
- **@nestjs/microservices**: ^11.1.3
- **rxjs**: ^7.8.2

## 📝 Лицензия

MIT License - см. файл [LICENSE](LICENSE) для деталей.

## 🤝 Contribution

Pull requests приветствуются! Для крупных изменений, пожалуйста, сначала откройте issue для обсуждения.
