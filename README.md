# @makebelieve21213-packages/nest-common

Общий пакет с утилитами для NestJS микросервисов проекта NakolenkeChain. Предоставляет единую систему обработки ошибок, валидации, логирования и базовые классы для HTTP, RPC и WebSocket контекстов.

## 📋 Содержание

1. [Обзор](#обзор)
2. [Система обработки ошибок](#система-обработки-ошибок)
3. [Классы ошибок](#классы-ошибок)
4. [Глобальные фильтры](#глобальные-фильтры)
5. [Перехватчики](#перехватчики)
6. [Базовые классы](#базовые-классы)
7. [Пайпы валидации](#пайпы-валидации)
8. [Утилиты](#утилиты)
9. [Типы](#типы)
10. [Использование](#использование)
11. [Best Practices](#best-practices)
12. [Обработка ошибок WebSocket](#обработка-ошибок-websocket)
13. [Дополнительные ресурсы](#дополнительные-ресурсы)

---

## 🎯 Обзор

Пакет предоставляет единую систему обработки ошибок для всех типов контекстов:
- **HTTP** - для HTTP контроллеров (api-service)
- **RPC** - для RabbitMQ RPC запросов (analytics-service, data-service, token-service)
- **WebSocket** - для Socket.io соединений (api-service)

Все ошибки автоматически преобразуются между контекстами с сохранением типа и статус-кода.

---

## 🔄 Система обработки ошибок

### Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│ HTTP Контекст (api-service)                                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  HTTP Controller (БЕЗ catch блоков)                        │
│    ↓                                                          │
│  Сервис (может иметь catch для логирования)                 │
│    ↓ (await rabbitMQService.publish)                       │
│  RpcException от RabbitMQ                                    │
│    ↓ (пробрасывается дальше)                                 │
│  UnifiedExceptionFilter (глобальный)                      │
│    ↓ HttpExceptionFilter.handleException()                  │
│    ↓ HttpError.fromUnknown()                                 │
│  HttpError с правильным статусом                             │
│    ↓                                                          │
│  HTTP Response для фронтенда                                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ RPC Контекст (analytics-service)                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  RPC Controller (БЕЗ catch блоков)                         │
│    ↓                                                          │
│  Сервис (ошибка в бизнес-логике)                            │
│    ↓ (пробрасывается дальше)                                 │
│  UnifiedExceptionFilter (глобальный)                       │
│    ↓ RpcExceptionFilter.handleException()                    │
│    ↓ RpcError.fromUnknown()                                  │
│  RpcError с типом (временная/постоянная)                    │
│    ↓ (определяет retry/DLX логику)                           │
│  Отправка через RabbitMQ в api-service                       │
│                                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ WebSocket Контекст (api-service)                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  SocketGateway.publish()                                     │
│    ↓ (ошибка при отправке события)                          │
│  SocketError.fromUnknown()                                   │
│    ↓                                                          │
│  Логирование + сохранение в Redis                           │
│    ↓ (опционально)                                           │
│  Отправка события ERROR на фронт через socket               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Принципы работы

1. **Глобальные фильтры** - все ошибки обрабатываются автоматически через глобальные фильтры
2. **Без catch блоков в контроллерах** - контроллеры не должны иметь try-catch блоков
3. **Автоматическое преобразование** - ошибки автоматически преобразуются между контекстами
4. **Сохранение типа и статуса** - тип ошибки и статус-код сохраняются при преобразовании

---

## 🚨 Классы ошибок

### HttpError

Класс ошибок для HTTP контекста. Используется в `api-service` для обработки HTTP запросов.

**Расположение:** `src/errors/http.error.ts`

**Наследование:** `HttpException` (NestJS)

**Особенности:**
- Автоматически преобразует `RpcException`/`RpcError` в HTTP ошибку
- Автоматически преобразует `SocketError` в HTTP ошибку
- Сохраняет правильный HTTP статус-код
- Включает stack trace в ответе, если он доступен в исходной ошибке

**Пример использования:**

```typescript
// В HTTP контроллере (БЕЗ catch блока)
@Get("/analytics/global")
async getGlobal() {
    // Ошибка автоматически обработается UnifiedExceptionFilter
    return await this.analyticsService.getGlobalData();
}

// В сервисе (опционально для логирования)
async getGlobalData() {
    try {
        const data = await this.rabbitMQService.publish(...);
        return data;
    } catch (error) {
        // Дополнительное логирование (опционально)
        this.logger.error(`Ошибка RPC: ${error}`);
        // Пробрасываем дальше - фильтр преобразует в HttpError
        throw error;
    }
}
```

**Преобразование ошибок:**

```typescript
// HttpError.fromUnknown() автоматически обрабатывает:
- HttpError → возвращает как есть (с опциональным descriptionPrefix)
- HttpException → извлекает статус и тип, сохраняет оригинальный формат message (массив остается массивом в getResponse())
- RpcException/RpcError → преобразует в HTTP с правильным статусом
- SocketError → преобразует в HTTP
- Error → определяет тип и создает HttpError
- Объекты с полем message → преобразует в HttpError
- Неизвестные типы → преобразует в строку и создает HttpError
```

**Важно:** 
- При преобразовании `HttpException` с массивом сообщений, оригинальный массив сохраняется в `getResponse()`, но для внутреннего `message` используется строка (массив объединяется через `"; "`).
- Опциональный параметр `descriptionPrefix` добавляется к сообщению ошибки для дополнительного контекста.

### RpcError

Класс ошибок для RabbitMQ RPC контекста. Используется в `analytics-service`, `data-service`, `token-service`.

**Расположение:** `src/errors/rpc.error.ts`

**Наследование:** `RpcException` (NestJS)

**Особенности:**
- Автоматически определяет тип ошибки (временная/постоянная)
- Сохраняет статус-код для будущего преобразования в HTTP
- Сериализуется через RabbitMQ с сохранением типа и сообщения
- Используется в `RpcExceptionFilter` для retry/DLX логики

**Типы ошибок:**

**Временные (retry):**
- `RPC_TIMEOUT` - таймаут соединения
- `SERVICE_UNAVAILABLE` - сервис недоступен
- `RPC_SERVICE_UNAVAILABLE` - RPC сервис недоступен

**Постоянные (DLX сразу):**
- `BAD_REQUEST` - неправильный запрос
- `UNAUTHORIZED` - ошибка авторизации
- `FORBIDDEN` - ошибка доступа
- `NOT_FOUND` - ресурс не найден
- `VALIDATION_ERROR` - ошибка валидации
- `RPC_VALIDATION_ERROR` - ошибка валидации RPC

**Методы:**
- `isTransient(): boolean` - проверяет, является ли ошибка временной (требует retry)

**Пример использования:**

```typescript
// В RPC контроллере (БЕЗ catch блока)
@MessagePattern(ROUTING_KEYS.ANALYTICS_GLOBAL)
async getGlobalData(
    @Payload() _: GlobalDataIncomeDto,
    @Ctx() ctx: RmqContext,
): Promise<GlobalDataOutcomeDto> {
    // Ошибка автоматически обработается UnifiedExceptionFilter
    const data = await this.analyticsService.getGlobalData();
    this.acknowledge(ctx);
    return data;
}
```

**Преобразование ошибок:**

```typescript
// RpcError.fromUnknown() автоматически:
- Распознает ошибки с свойством isAxiosError и преобразует их с сохранением типа и статуса
- Определяет тип ошибки из сообщения
- Классифицирует как временную или постоянную
- Сохраняет оригинальную ошибку для логирования
- Обрабатывает сериализованные объекты ошибок из RabbitMQ
```

**Интеграция с AxiosError:**

`RpcError.fromUnknown()` автоматически распознает ошибки с свойством `isAxiosError` и преобразует их в `RpcError` с сохранением типа ошибки и статус-кода из оригинальной Axios ошибки.

### SocketError

Класс ошибок для WebSocket контекста. Используется в `api-service` для обработки ошибок Socket.io.

**Расположение:** `src/errors/socket.error.ts`

**Наследование:** `HttpException` (NestJS) - для совместимости с HTTP фильтрами

**Особенности:**
- Используется для обработки ошибок при отправке событий через Socket.io
- Логируется и сохраняется в Redis
- Может быть отправлена на фронт через событие `SOCKET_EVENTS.ERROR`
- Не связана с HTTP или RPC ошибками

**Пример использования:**

```typescript
// В SocketGateway
async publish(userId: string, event: SOCKET_EVENTS, payload: unknown) {
    try {
        await this.io.timeout(5000).to(`user:${userId}`).emitWithAck(event, payload);
    } catch (error) {
        const socketError = SocketError.fromUnknown(error);
        
        // Логирование
        this.logger.error(`Ошибка отправки события: ${socketError.message}`);
        
        // Сохранение в Redis
        await this.redisService.hSet(
            REDIS_H_KEYS.SOCKET_ERROR,
            userId,
            socketError.message,
        );
        
        // Опционально: отправка ошибки на фронт
        await this.io.to(`user:${userId}`).emit(SOCKET_EVENTS.ERROR, {
            status: "error",
            message: socketError.message,
        });
        
        throw socketError;
    }
}
```

### JsonRpcException

Класс исключений для JSON-RPC 2.0 протокола. Используется для обработки ошибок в формате JSON-RPC.

**Расположение:** `src/errors/json-rpc.error.ts`

**Наследование:** `HttpException` (NestJS) - для совместимости с NestJS фильтрами

**Особенности:**
- Поддерживает стандартные коды ошибок JSON-RPC 2.0
- Автоматически маппит HTTP статусы на JSON-RPC коды ошибок
- Поддерживает дополнительные данные в поле `data`
- Может быть создан из `HttpException` или обычной `Error`
- Возвращает ответ в формате JSON-RPC 2.0

**Пример использования:**

```typescript
import { JsonRpcException, JsonRpcErrorCode } from "@packages/nest-common";

// Создание исключения с кодом ошибки
throw new JsonRpcException(
    JsonRpcErrorCode.INVALID_REQUEST,
    "Invalid request parameters",
    { requestId: "123", details: "Missing required field" },
);

// Создание из HttpException
const httpException = new HttpException("Not found", HttpStatus.NOT_FOUND);
const rpcException = JsonRpcException.fromHttpException(httpException, "request-id");

// Создание из обычной Error
const error = new Error("Something went wrong");
const rpcException = JsonRpcException.fromError(error, "request-id");
```

**Коды ошибок JSON-RPC 2.0:**
- `PARSE_ERROR` (-32700) - Ошибка парсинга JSON
- `INVALID_REQUEST` (-32600) - Невалидный запрос
- `METHOD_NOT_FOUND` (-32601) - Метод не найден
- `INVALID_PARAMS` (-32602) - Невалидные параметры
- `INTERNAL_ERROR` (-32603) - Внутренняя ошибка сервера
- `UNAUTHORIZED` (-32001) - Неавторизованный доступ
- `FORBIDDEN` (-32002) - Доступ запрещен
- `NOT_FOUND` (-32003) - Ресурс не найден
- И другие кастомные коды (-32004 до -32099)

---

## 🛡️ Глобальные фильтры

### UnifiedExceptionFilter

Единый глобальный фильтр для обработки HTTP и RPC ошибок. Автоматически определяет тип контекста и использует соответствующий обработчик.

**Расположение:** `src/filters/unified-exception.filter.ts`

### JsonRpcExceptionFilter

Фильтр исключений для обработки ошибок в формате JSON-RPC 2.0. Преобразует все исключения NestJS в формат JSON-RPC 2.0.

**Расположение:** `src/filters/json-rpc-exception.filter.ts`

**Особенности:**
- Автоматически извлекает `requestId` из тела запроса
- Преобразует `JsonRpcException` в JSON-RPC формат ответа
- Преобразует обычные `Error` в JSON-RPC формат с автоматическим определением статуса
- Обрабатывает неизвестные типы исключений
- Логирует все ошибки с контекстом

**Использование:**

```typescript
import { Controller, Post, Body, UseFilters } from "@nestjs/common";
import { JsonRpcExceptionFilter, JsonRpcValidationPipe } from "@packages/nest-common";
import type { JsonRpcRequest } from "@packages/nest-common";

@Controller("mcp")
@UseFilters(JsonRpcExceptionFilter)
export default class McpController extends BaseController {
    constructor(private readonly logger: LoggerService) {
        super();
    }

    @Post()
    async handleJsonRpcRequest(
        @Body(JsonRpcValidationPipe) request: JsonRpcRequest,
    ) {
        // Обработка запроса
        if (request.method === "test.method") {
            return {
                jsonrpc: "2.0",
                id: request.id,
                result: { success: true },
            };
        }
        
        throw new JsonRpcException(
            JsonRpcErrorCode.METHOD_NOT_FOUND,
            `Method ${request.method} not found`,
        );
    }
}
```

**Регистрация глобально:**

```typescript
// В main.ts
import { JsonRpcExceptionFilter } from "@packages/nest-common";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const logger = await connectLogger(app, "ServiceName");
    
    app.useGlobalFilters(new JsonRpcExceptionFilter(logger));
    
    await app.listen(PORT);
}
```

**Регистрация:**

```typescript
// В main.ts микросервиса
import { UnifiedExceptionFilter } from "@packages/nest-common";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const logger = await connectLogger(app, "ServiceName");
    
    // Регистрируем глобальный фильтр
    // Для RPC контекста можно передать dlxExchange для DLX логики
    app.useGlobalFilters(
        new UnifiedExceptionFilter(logger, dlxExchange), // dlxExchange опционально
    );
    
    await app.listen(PORT);
}
```

**Логика работы:**

1. Определяет тип контекста (HTTP или RPC)
2. Использует соответствующий обработчик:
   - **HTTP контекст** → `HttpExceptionFilter.handleException()`
   - **RPC контекст** → `RpcExceptionFilter.handleException()`
3. Обработчики преобразуют ошибки и формируют ответы

**Внутренние обработчики:**

- **HttpExceptionFilter** (`src/filters/http-exception-handler.ts`) - обрабатывает HTTP ошибки
- **RpcExceptionFilter** (`src/filters/rpc-exception-handler.ts`) - обрабатывает RPC ошибки с поддержкой retry/DLX

**Формат HTTP ответа:**

```json
{
    "statusCode": 500,
    "timestamp": "2024-01-01T00:00:00.000Z",
    "path": "/api/analytics/global",
    "error": "INTERNAL_SERVER_ERROR",
    "message": "Ошибка получения данных",
    "stack": "..." // Если доступен в исходной ошибке
}
```

**Retry логика для RPC:**

```typescript
// Постоянная ошибка (BAD_REQUEST, UNAUTHORIZED, etc.)
if (!isTransient) {
    // Сразу в DLX, не тратим попытки retry
    channel.publish(dlxExchange, routingKey, content);
    channel.ack(msg);
    throw rpcError; // Отправляем клиенту
}

// Временная ошибка (TIMEOUT, SERVICE_UNAVAILABLE)
if (retries < MAX_RETRIES) {
    // Отправляем в retry очередь
    channel.nack(msg, false, false);
    return; // НЕ throw - сообщение будет обработано повторно
} else {
    // Превышен лимит - в DLX
    channel.publish(dlxExchange, routingKey, content);
    channel.ack(msg);
    throw rpcError; // Отправляем клиенту
}
```

---

## 🔍 Перехватчики

Перехватчики (Interceptors) используются для логирования и мониторинга всех запросов в приложении. Они автоматически перехватывают запросы до и после их выполнения, позволяя логировать метрики производительности и отслеживать все входящие запросы.

### UnifiedInterceptor

Единый глобальный перехватчик для логирования HTTP и RPC запросов. Автоматически определяет тип контекста и использует соответствующий обработчик.

**Расположение:** `src/interceptors/unified.interceptor.ts`

**Особенности:**
- Автоматически определяет тип контекста (HTTP или RPC)
- Использует соответствующий обработчик для логирования
- Логирует все входящие запросы с метриками производительности
- Работает с любыми эндпоинтами автоматически

**Регистрация:**

```typescript
// В main.ts микросервиса
import { UnifiedInterceptor } from "@packages/nest-common";
import { LoggerService } from "@makebelieve21213-packages/logger";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const logger = await connectLogger(app, "ServiceName");
    
    // Регистрируем глобальный перехватчик
    app.useGlobalInterceptors(new UnifiedInterceptor(logger));
    
    await app.listen(PORT);
}
```

**Внутренние обработчики:**

- **HttpLoggingInterceptor** (`src/interceptors/http-logging.interceptor.ts`) - логирует HTTP запросы
- **RpcLoggingInterceptor** (`src/interceptors/rpc-logging.interceptor.ts`) - логирует RPC запросы
- **WebSocketLoggingInterceptor** (`src/interceptors/websocket-logging.interceptor.ts`) - логирует WebSocket запросы

**Логика работы:**

1. Определяет тип контекста (HTTP, RPC или WebSocket)
2. Использует соответствующий обработчик:
   - **HTTP контекст** → `HttpLoggingInterceptor.intercept()`
   - **RPC контекст** → `RpcLoggingInterceptor.intercept()`
3. Обработчики логируют запросы с метриками времени выполнения

**Формат логов HTTP:**

```
[HTTP] Incoming request [GET /api/analytics/global] from 127.0.0.1 (Mozilla/5.0...)
[HTTP] Request completed [GET /api/analytics/global] 200 45ms
[HTTP] Request failed [GET /api/analytics/global] 500 120ms - Internal server error
```

**Формат логов RPC:**

```
[RPC] Incoming request [pattern: analytics.global]
[RPC] Request completed [pattern: analytics.global, duration: 45ms]
[RPC] Request failed [pattern: analytics.global, duration: 120ms, error: Service unavailable]
```

---

## 🎛️ Базовые классы

### BaseController

Базовый контроллер для всех контроллеров проекта. Предоставляет общую функциональность для HTTP и RPC контроллеров.

**Расположение:** `src/base/base.controller.ts`

**Особенности:**
- Предоставляет общие методы для HTTP и RPC контроллеров
- Метод `acknowledge(ctx: RmqContext)` для подтверждения RPC сообщений
- Автоматически настраивает контекст логирования на имя класса контроллера

**Методы:**
- `protected acknowledge(ctx: RmqContext): void` - отправляет acknowledge сообщение в RabbitMQ

**Пример использования:**

```typescript
import { Controller, Get } from "@nestjs/common";
import { BaseController } from "@packages/nest-common";
import { LoggerService } from "@makebelieve21213-packages/logger";

@Controller("analytics")
export default class AnalyticsController extends BaseController {
    constructor(
        private readonly analyticsService: AnalyticsService,
        logger: LoggerService,
    ) {
        super(logger);
    }

    @Get("global")
    async getGlobal() {
        // БЕЗ try-catch - глобальный фильтр все обработает
        return await this.analyticsService.getGlobalData();
    }
}
```

---

## 🔧 Пайпы валидации

### HttpValidationPipe

Валидация DTO для HTTP контроллеров с использованием `class-validator`.

**Расположение:** `src/pipes/http-validation.pipe.ts`

**Особенности:**
- Автоматическое преобразование plain objects в DTO экземпляры через `plainToInstance` с `enableImplicitConversion: true`
- Валидация с `whitelist: true` и `forbidNonWhitelisted: true`
- Выбрасывает `BadRequestException` при ошибках валидации
- Сообщения об ошибках объединяются через `"; "`

**Использование:**

```typescript
import { Controller, Post, Body } from "@nestjs/common";
import { HttpValidationPipe } from "@packages/nest-common";
import { CreateDto } from "@packages/dtos";

@Controller("tokens")
export default class TokenController extends BaseController {
    @Post("create")
    @UsePipes(new HttpValidationPipe(CreateDto))
    async create(@Body() dto: CreateDto) {
        return await this.tokenService.create(dto);
    }
}
```

### RpcValidationPipe

Валидация DTO для RabbitMQ микросервисов с использованием `class-validator`.

**Расположение:** `src/pipes/rpc-validation.pipe.ts`

**Особенности:**
- Автоматическое преобразование plain objects в DTO экземпляры через `plainToInstance` с `enableImplicitConversion: true`
- Обрабатывает случаи, когда value может быть `undefined` или `null` (для пустых DTO передает пустой объект)
- Автоматически извлекает и исключает `correlationId` и `correlationTimestamp` из сообщения перед валидацией (для поддержки идемпотентности)
- Валидация с `whitelist: true` и `forbidNonWhitelisted: true`
- Выбрасывает `RpcException` при ошибках валидации
- Сообщения об ошибках объединяются через `"; "`

**Использование:**

```typescript
import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { RpcValidationPipe } from "@packages/nest-common";
import { GlobalDataIncomeDto } from "@packages/dtos";

@Controller()
export default class AnalyticsController extends BaseController {
    @MessagePattern(ROUTING_KEYS.ANALYTICS_GLOBAL)
    @UsePipes(new RpcValidationPipe(GlobalDataIncomeDto))
    async getGlobalData(@Payload() dto: GlobalDataIncomeDto) {
        return await this.analyticsService.getGlobalData();
    }
}
```

**Обработка correlationId и correlationTimestamp:**

Pipe автоматически извлекает поля `correlationId` и `correlationTimestamp` из входящего сообщения (если они присутствуют) и исключает их из валидации DTO. Это позволяет использовать эти поля для идемпотентности без необходимости добавлять их в DTO классы.

### FileValidationPipe

Валидация загруженных файлов с проверкой размера, MIME типа и расширения.

**Расположение:** `src/pipes/file-validation.pipe.ts`

**Особенности:**
- Валидирует одиночные файлы и массивы файлов
- Проверяет размер файла (по умолчанию максимум 10MB)
- Проверяет MIME тип файла
- Проверяет расширение файла
- Выбрасывает `BadRequestException` при ошибках валидации

**Использование:**

```typescript
import { Controller, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { FileValidationPipe } from "@packages/nest-common";

@Controller("upload")
export default class UploadController extends BaseController {
    @Post("file")
    @UseInterceptors(FileInterceptor("file"))
    async uploadFile(
        @UploadedFile(
            new FileValidationPipe({
                maxSize: 5 * 1024 * 1024, // 5MB
                allowedMimeTypes: ["image/jpeg", "image/png"],
                allowedExtensions: ["jpg", "jpeg", "png"],
            }),
        )
        file: MulterFile,
    ) {
        return await this.uploadService.saveFile(file);
    }
}
```

### QueryValidationPipe

Валидация query параметров HTTP запросов с использованием `class-validator`.

**Расположение:** `src/pipes/query-validation.pipe.ts`

**Особенности:**
- Автоматическое преобразование plain objects в DTO экземпляры через `plainToInstance`
- Валидация только для query параметров (`metadata.type === "query"`)
- Выбрасывает `BadRequestException` с детальными ошибками валидации
- Поддерживает вложенные объекты и массивы

**Использование:**

```typescript
import { Controller, Get, Query } from "@nestjs/common";
import { QueryValidationPipe } from "@packages/nest-common";
import { PaginationDto } from "@packages/dtos";

@Controller("users")
export default class UsersController extends BaseController {
    @Get()
    async getUsers(
        @Query(new QueryValidationPipe(PaginationDto)) query: PaginationDto,
    ) {
        return await this.usersService.findAll(query);
    }
}
```

### HeaderValidationPipe

Валидация заголовков HTTP запросов с использованием `class-validator`.

**Расположение:** `src/pipes/header-validation.pipe.ts`

**Особенности:**
- Автоматическое преобразование plain objects в DTO экземпляры через `plainToInstance`
- Валидация только для custom параметров (`metadata.type === "custom"`)
- Выбрасывает `BadRequestException` с детальными ошибками валидации
- Поддерживает вложенные объекты и массивы

**Использование:**

```typescript
import { Controller, Get, Headers } from "@nestjs/common";
import { HeaderValidationPipe } from "@packages/nest-common";
import { ApiHeadersDto } from "@packages/dtos";

@Controller("api")
export default class ApiController extends BaseController {
    @Get("data")
    async getData(
        @Headers(new HeaderValidationPipe(ApiHeadersDto)) headers: ApiHeadersDto,
    ) {
        return await this.apiService.getData(headers);
    }
}
```

### JsonRpcValidationPipe

Валидация JSON-RPC 2.0 запросов согласно спецификации протокола.

**Расположение:** `src/pipes/json-rpc-validation.pipe.ts`

**Особенности:**
- Проверяет структуру запроса согласно спецификации JSON-RPC 2.0
- Валидирует версию протокола (`jsonrpc: "2.0"`)
- Проверяет наличие и тип поля `method` (должно быть строкой)
- Валидирует тип поля `id` (должно быть string, number или null)
- Валидирует тип поля `params` (должно быть object или undefined)
- Игнорирует объекты с NestJS метаданными (constructorRef, handler, contextType)
- Выбрасывает `JsonRpcException` при ошибках валидации

**Использование:**

```typescript
import { Controller, Post, Body } from "@nestjs/common";
import { JsonRpcValidationPipe, JsonRpcExceptionFilter } from "@packages/nest-common";
import type { JsonRpcRequest } from "@packages/nest-common";

@Controller("mcp")
@UseFilters(JsonRpcExceptionFilter)
export default class McpController extends BaseController {
    @Post()
    async handleJsonRpcRequest(
        @Body(JsonRpcValidationPipe) request: JsonRpcRequest,
    ) {
        // Обработка JSON-RPC запроса
        return {
            jsonrpc: "2.0",
            id: request.id,
            result: { /* результат */ },
        };
    }
}
```

---

## 🔍 Перехватчики (дополнительные)

### ResponseInterceptor

Перехватчик для стандартизации формата HTTP ответов. Автоматически оборачивает ответы в стандартный формат `StandardResponse`.

**Расположение:** `src/interceptors/response.interceptor.ts`

**Особенности:**
- Автоматически оборачивает ответы в формат `{ success: true, data: T, meta: {...} }`
- Добавляет метаданные: timestamp, path, requestId
- Если ответ уже в стандартном формате, возвращает как есть
- Работает только с HTTP контекстом

**Использование:**

```typescript
import { Controller, Get, UseInterceptors } from "@nestjs/common";
import { ResponseInterceptor } from "@packages/nest-common";

@Controller("users")
@UseInterceptors(ResponseInterceptor)
export default class UsersController extends BaseController {
    @Get()
    async getUsers() {
        // Ответ автоматически обернется в StandardResponse
        return await this.usersService.findAll();
    }
}
```

**Формат ответа:**

```json
{
    "success": true,
    "data": { /* ваши данные */ },
    "meta": {
        "timestamp": "2024-01-01T00:00:00.000Z",
        "path": "/api/users",
        "requestId": "req-123"
    }
}
```

### SerializeInterceptor

Перехватчик для сериализации ответов с исключением чувствительных данных на основе DTO классов.

**Расположение:** `src/interceptors/serialize.interceptor.ts`

**Особенности:**
- Использует декоратор `@Serialize()` для указания DTO класса
- Автоматически исключает поля, не помеченные `@Expose()` в DTO
- Поддерживает массивы данных
- Работает с `class-transformer` и `excludeExtraneousValues: true`

**Использование:**

```typescript
import { Controller, Get, UseInterceptors } from "@nestjs/common";
import { SerializeInterceptor, Serialize } from "@packages/nest-common";
import { UserResponseDto } from "@packages/dtos";

@Controller("users")
@UseInterceptors(SerializeInterceptor)
export default class UsersController extends BaseController {
    @Get(":id")
    @Serialize(UserResponseDto) // Указываем DTO для сериализации
    async getUser(@Param("id") id: string) {
        // Поля, не помеченные @Expose() в UserResponseDto, будут исключены
        return await this.usersService.findOne(id);
    }
}
```

### CompressionInterceptor

Перехватчик для автоматического сжатия больших HTTP ответов с использованием gzip.

**Расположение:** `src/interceptors/compression.interceptor.ts`

**Особенности:**
- Автоматически сжимает ответы больше заданного порога (по умолчанию 1024 байт)
- Использует gzip сжатие
- Проверяет эффективность сжатия (минимальный коэффициент сжатия 0.8)
- Устанавливает заголовки `Content-Encoding: gzip` и `Content-Type: application/json`
- Если сжатие неэффективно, возвращает исходные данные

**Использование:**

```typescript
import { Controller, Get, UseInterceptors } from "@nestjs/common";
import { CompressionInterceptor } from "@packages/nest-common";

@Controller("data")
@UseInterceptors(new CompressionInterceptor(2048, 0.7)) // Порог 2KB, коэффициент 0.7
export default class DataController extends BaseController {
    @Get("large")
    async getLargeData() {
        // Большие ответы автоматически сжимаются
        return await this.dataService.getLargeDataset();
    }
}
```

### RequestIdResponseInterceptor

Перехватчик для добавления Request ID в заголовки HTTP ответов.

**Расположение:** `src/interceptors/request-id-response.interceptor.ts`

**Особенности:**
- Извлекает Request ID из заголовков запроса (`x-request-id`) или `request.id`
- Добавляет Request ID в заголовок ответа `X-Request-ID`
- Работает только с HTTP контекстом

**Использование:**

```typescript
import { Controller, Get, UseInterceptors } from "@nestjs/common";
import { RequestIdResponseInterceptor } from "@packages/nest-common";

@Controller("api")
@UseInterceptors(RequestIdResponseInterceptor)
export default class ApiController extends BaseController {
    @Get("data")
    async getData() {
        // Request ID автоматически добавится в заголовки ответа
        return await this.apiService.getData();
    }
}
```

---

## 🛡️ Guards (Охранники)

Guards используются для контроля доступа к эндпоинтам на основе аутентификации, авторизации и других условий.

### JwtAuthGuard

Guard для проверки JWT токена и аутентификации пользователя.

**Расположение:** `src/guards/jwt-auth.guard.ts`

**Особенности:**
- Проверяет наличие пользователя в `request.user`
- Уважает декоратор `@Public()` - пропускает публичные эндпоинты
- Выбрасывает `UnauthorizedException` если пользователь не аутентифицирован

**Использование:**

```typescript
import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "@packages/nest-common";

@Controller("users")
@UseGuards(JwtAuthGuard)
export default class UsersController extends BaseController {
    @Get("profile")
    async getProfile(@Request() req) {
        // req.user доступен после прохождения JwtAuthGuard
        return await this.usersService.getProfile(req.user);
    }
}
```

### ApiKeyGuard

Guard для проверки API ключа в заголовках запроса.

**Расположение:** `src/guards/api-key.guard.ts`

**Особенности:**
- Проверяет наличие API ключа в заголовке (по умолчанию `x-api-key`)
- Уважает декоратор `@Public()` - пропускает публичные эндпоинты
- Работает только с эндпоинтами, помеченными декоратором `@ApiKey()`
- Опционально проверяет ключ против списка валидных ключей
- Выбрасывает `UnauthorizedException` при отсутствии или невалидном ключе

**Использование:**

```typescript
import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiKeyGuard, ApiKey } from "@packages/nest-common";

@Controller("api")
export default class ApiController extends BaseController {
    constructor() {
        // Создаем guard с валидными ключами
        super();
    }

    @Get("data")
    @UseGuards(new ApiKeyGuard(undefined, "x-api-key", new Set(["key1", "key2"])))
    @ApiKey() // Помечаем эндпоинт как требующий API ключ
    async getData() {
        return await this.apiService.getData();
    }
}
```

### RolesGuard

Guard для проверки ролей пользователя.

**Расположение:** `src/guards/roles.guard.ts`

**Особенности:**
- Проверяет наличие требуемых ролей у пользователя
- Использует декоратор `@Roles()` для указания требуемых ролей
- Проверяет, что у пользователя есть хотя бы одна из указанных ролей
- Выбрасывает `ForbiddenException` при недостаточных правах

**Использование:**

```typescript
import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard, RolesGuard, Roles } from "@packages/nest-common";

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
export default class AdminController extends BaseController {
    @Get("users")
    @Roles("admin", "moderator") // Требуются роли admin или moderator
    async getUsers() {
        return await this.adminService.getUsers();
    }
}
```

### PermissionsGuard

Guard для проверки разрешений пользователя.

**Расположение:** `src/guards/permissions.guard.ts`

**Особенности:**
- Проверяет наличие требуемых разрешений у пользователя
- Использует декоратор `@Permissions()` для указания требуемых разрешений
- Проверяет, что у пользователя есть ВСЕ указанные разрешения
- Выбрасывает `ForbiddenException` при недостаточных правах

**Использование:**

```typescript
import { Controller, Delete, UseGuards } from "@nestjs/common";
import { JwtAuthGuard, PermissionsGuard, Permissions } from "@packages/nest-common";

@Controller("users")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export default class UsersController extends BaseController {
    @Delete(":id")
    @Permissions("users:delete", "users:write") // Требуются ВСЕ указанные разрешения
    async deleteUser(@Param("id") id: string) {
        return await this.usersService.delete(id);
    }
}
```

### RateLimitGuard

Guard для ограничения частоты запросов (Rate Limiting).

**Расположение:** `src/guards/rate-limit.guard.ts`

**Особенности:**
- Ограничивает количество запросов за временное окно
- По умолчанию: 100 запросов в минуту для аутентифицированных пользователей
- Для публичных эндпоинтов применяется более строгий лимит (50% от базового)
- Использует IP адрес и путь запроса для идентификации клиента
- Поддерживает кастомный генератор ключей
- Выбрасывает `HttpException` с кодом 429 (Too Many Requests) при превышении лимита
- Автоматически очищает устаревшие записи

**Использование:**

```typescript
import { Controller, Get, UseGuards } from "@nestjs/common";
import { RateLimitGuard } from "@packages/nest-common";

@Controller("api")
@UseGuards(new RateLimitGuard(undefined, 200, 60000)) // 200 запросов в минуту
export default class ApiController extends BaseController {
    @Get("data")
    async getData() {
        return await this.apiService.getData();
    }
}
```

### WebSocketAuthGuard

Guard для проверки аутентификации при подключении к WebSocket.

**Расположение:** `src/guards/websocket-auth.guard.ts`

**Особенности:**
- Проверяет наличие токена в данных подключения или handshake
- Поддерживает кастомный валидатор токена через коллбек `TokenValidator`
- Выбрасывает `WsException` при отсутствии или невалидном токене

**Использование:**

```typescript
import { WebSocketGateway, SubscribeMessage, UseGuards } from "@nestjs/websockets";
import { WebSocketAuthGuard } from "@packages/nest-common";

@WebSocketGateway()
export default class ChatGateway {
    constructor(
        @Inject(WebSocketAuthGuard)
        private readonly authGuard: WebSocketAuthGuard,
    ) {
        // Создаем guard с валидатором токена
        this.authGuard = new WebSocketAuthGuard(async (token, context) => {
            return await this.authService.validateToken(token);
        });
    }

    @SubscribeMessage("message")
    @UseGuards(this.authGuard)
    async handleMessage(client: Socket, payload: unknown) {
        // Токен проверен через WebSocketAuthGuard
        return await this.chatService.sendMessage(payload);
    }
}
```

---

## 🎨 Декораторы

Декораторы используются для добавления метаданных к эндпоинтам и контроллерам.

### @Public()

Декоратор для пометки эндпоинта как публичного (без аутентификации).

**Расположение:** `src/decorators/public.decorator.ts`

**Использование:**

```typescript
import { Controller, Get } from "@nestjs/common";
import { Public } from "@packages/nest-common";

@Controller("public")
export default class PublicController extends BaseController {
    @Get("info")
    @Public() // Эндпоинт доступен без аутентификации
    async getInfo() {
        return { message: "Public information" };
    }
}
```

### @Roles()

Декоратор для указания ролей, необходимых для доступа к эндпоинту.

**Расположение:** `src/decorators/roles.decorator.ts`

**Использование:**

```typescript
import { Controller, Get } from "@nestjs/common";
import { Roles } from "@packages/nest-common";

@Controller("admin")
export default class AdminController extends BaseController {
    @Get("dashboard")
    @Roles("admin", "moderator") // Требуются роли admin или moderator
    async getDashboard() {
        return await this.adminService.getDashboard();
    }
}
```

### @Permissions()

Декоратор для указания разрешений, необходимых для доступа к эндпоинту.

**Расположение:** `src/decorators/permissions.decorator.ts`

**Использование:**

```typescript
import { Controller, Delete } from "@nestjs/common";
import { Permissions } from "@packages/nest-common";

@Controller("users")
export default class UsersController extends BaseController {
    @Delete(":id")
    @Permissions("users:delete", "users:write") // Требуются ВСЕ указанные разрешения
    async deleteUser(@Param("id") id: string) {
        return await this.usersService.delete(id);
    }
}
```

### @ApiKey()

Декоратор для пометки эндпоинта как требующего API ключ.

**Расположение:** `src/decorators/api-key.decorator.ts`

**Использование:**

```typescript
import { Controller, Get } from "@nestjs/common";
import { ApiKey } from "@packages/nest-common";

@Controller("api")
export default class ApiController extends BaseController {
    @Get("data")
    @ApiKey() // Эндпоинт требует API ключ в заголовке x-api-key
    async getData() {
        return await this.apiService.getData();
    }
}
```

### @Serialize()

Декоратор для указания класса DTO для сериализации ответа.

**Расположение:** `src/decorators/serialize.decorator.ts`

**Использование:**

```typescript
import { Controller, Get } from "@nestjs/common";
import { Serialize } from "@packages/nest-common";
import { UserResponseDto } from "@packages/dtos";

@Controller("users")
export default class UsersController extends BaseController {
    @Get(":id")
    @Serialize(UserResponseDto) // Ответ будет сериализован через UserResponseDto
    async getUser(@Param("id") id: string) {
        return await this.usersService.findOne(id);
    }
}
```

---

## 🛠️ Утилиты

### validateEnv

Функция валидации переменных окружения с использованием Joi.

**Расположение:** `src/utils/env-validator.ts`

**Особенности:**
- Валидация обязательных переменных окружения
- Выбрасывает `Error` с описанием отсутствующих ключей
- Возвращает валидированный объект env
- Использует `Joi.string().required()` для каждого обязательного ключа
- Разрешает дополнительные ключи через `unknown(true)`
- Использует `abortEarly: false` для получения всех ошибок валидации

**Использование:**

```typescript
import { validateEnv } from "@packages/nest-common";

const env = process.env;
const requiredKeys = ["DATABASE_URL", "REDIS_URL", "RABBITMQ_URL"];

// Выбрасывает Error если ключи отсутствуют
const validatedEnv = validateEnv(env, requiredKeys);
```

### Утилиты для работы с контекстом

Функции для извлечения данных из контекста выполнения запроса.

**Расположение:** `src/utils/context.utils.ts`

**Функции:**
- `getUserFromContext(context: ExecutionContext): UserFromContext | undefined` - извлекает пользователя из контекста
- `getIpFromContext(context: ExecutionContext): string` - извлекает IP адрес из контекста
- `getUserAgentFromContext(context: ExecutionContext): string` - извлекает User-Agent из контекста
- `getRequestIdFromContext(context: ExecutionContext): string` - извлекает Request ID из контекста

**Использование:**

```typescript
import { getUserFromContext, getIpFromContext } from "@packages/nest-common";

@Controller("users")
export default class UsersController extends BaseController {
    @Get("profile")
    async getProfile(@ExecutionContext() context: ExecutionContext) {
        const user = getUserFromContext(context);
        const ip = getIpFromContext(context);
        
        return await this.usersService.getProfile(user, ip);
    }
}
```

### createCorsOptions

Функция для создания опций CORS для NestJS приложения.

**Расположение:** `src/utils/cors.utils.ts`

**Особенности:**
- Настраивает CORS с разумными значениями по умолчанию
- Поддерживает кастомные настройки origin, methods, headers и т.д.
- По умолчанию разрешает все источники, основные HTTP методы и стандартные заголовки

**Использование:**

```typescript
import { NestFactory } from "@nestjs/core";
import { createCorsOptions } from "@packages/nest-common";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    
    app.enableCors(createCorsOptions({
        origin: ["https://example.com"],
        credentials: true,
    }));
    
    await app.listen(3000);
}
```

### createCompressionOptions

Функция для создания опций compression для NestJS приложения.

**Расположение:** `src/utils/compression.utils.ts`

**Особенности:**
- Настраивает compression middleware с разумными значениями по умолчанию
- По умолчанию сжимает только текстовые типы контента
- Поддерживает кастомные настройки уровня сжатия, порога и фильтров

**Использование:**

```typescript
import { NestFactory } from "@nestjs/core";
import { createCompressionOptions } from "@packages/nest-common";
import compression from "compression";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    
    app.use(compression(createCompressionOptions({
        level: 9, // Максимальное сжатие
        threshold: 512, // Сжимать ответы больше 512 байт
    })));
    
    await app.listen(3000);
}
```

### createVersioningOptions

Функция для создания опций версионирования API для NestJS приложения.

**Расположение:** `src/utils/versioning.utils.ts`

**Особенности:**
- Поддерживает три стратегии версионирования: URI, Header, Media-Type
- Настраивает версионирование с указанием типа и версии по умолчанию

**Использование:**

```typescript
import { NestFactory } from "@nestjs/core";
import { createVersioningOptions } from "@packages/nest-common";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    
    app.enableVersioning(createVersioningOptions({
        type: "uri",
        defaultVersion: "1",
    }));
    
    await app.listen(3000);
}
```

### Утилиты для работы с файлами

Функции для валидации и работы с файлами.

**Расположение:** `src/utils/file.utils.ts`

**Функции:**
- `validateFile(file: MulterFile, options?: FileValidationOptions): FileValidationResult` - валидирует файл по заданным опциям
- `getFileExtension(filename: string): string` - получает расширение файла из имени
- `formatFileSize(bytes: number): string` - форматирует размер файла в читаемый формат

**Использование:**

```typescript
import { validateFile, formatFileSize } from "@packages/nest-common";

const result = validateFile(file, {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ["image/jpeg", "image/png"],
    allowedExtensions: ["jpg", "jpeg", "png"],
});

if (!result.isValid) {
    console.error(result.errors);
}

const size = formatFileSize(1024 * 1024); // "1 MB"
```

### CircuitBreakerService

Сервис для реализации паттерна Circuit Breaker для защиты от каскадных сбоев.

**Расположение:** `src/utils/circuit-breaker.ts`

**Особенности:**
- Реализует три состояния: CLOSED (нормальная работа), OPEN (разомкнут), HALF_OPEN (тестирование)
- Автоматически открывает circuit при превышении порога ошибок
- Автоматически закрывает circuit при успешных запросах в HALF_OPEN состоянии
- Поддерживает настройку порогов ошибок и успешных запросов
- Логирует переходы между состояниями

**Использование:**

```typescript
import { CircuitBreakerService } from "@packages/nest-common";
import { LoggerService } from "@makebelieve21213-packages/logger";

const circuitBreaker = new CircuitBreakerService(logger, {
    failureThreshold: 5, // Открыть после 5 ошибок
    successThreshold: 2, // Закрыть после 2 успешных запросов
    resetTimeout: 60000, // Переход в HALF_OPEN через 1 минуту
});

try {
    const result = await circuitBreaker.execute("external-api", async () => {
        return await externalApi.call();
    });
} catch (error) {
    // Circuit breaker открыт или произошла ошибка
}
```

### getServicePath

Универсальная функция для определения пути в сервисе независимо от точки запуска и режима (dev/production).

**Расположение:** `src/utils/get-service-path.ts`

**Особенности:**
- Работает одинаково в dev (src) и production (dist) режимах
- Всегда использует пути относительно src/
- Поддерживает три типа путей: locales, srcRoot, file
- Автоматически находит корень сервиса по наличию папки src

**Использование:**

```typescript
import { getServicePath } from "@packages/nest-common";

// Получить путь к локалям
const localesPath = getServicePath({
    serviceName: "api-service",
    dirname: __dirname,
    pathType: "locales",
    relativePath: "locales",
});

// Получить путь к файлу
const filePath = getServicePath({
    serviceName: "api-service",
    dirname: __dirname,
    pathType: "file",
    relativePath: "config/app.config.ts",
});
```

---

## 📝 Типы

### ErrorResponse

Интерфейс для HTTP ответов с ошибками.

**Расположение:** `src/types/http-response.ts`

```typescript
interface ErrorResponse {
    statusCode: number;
    timestamp: string;
    path: string;
    error: string;
    message: string;
    stack?: string; // Если доступен в исходной ошибке
}
```

### StandardResponse

Интерфейс стандартизированного ответа для HTTP запросов.

**Расположение:** `src/types/http-response.ts`

```typescript
interface StandardResponse<T = unknown> {
    success: boolean;
    data: T;
    meta?: {
        timestamp: string;
        path?: string;
        requestId?: string;
        [key: string]: unknown;
    };
}
```

### RpcErrorType

Enum типов ошибок RPC для классификации временных и постоянных ошибок.

**Расположение:** `src/types/rpc-types.ts`

**Временные ошибки (retry):**
- `RPC_TIMEOUT` - таймаут соединения
- `SERVICE_UNAVAILABLE` - сервис недоступен
- `RPC_SERVICE_UNAVAILABLE` - RPC сервис недоступен

**Постоянные ошибки (DLX сразу):**
- `BAD_REQUEST` - неправильный запрос
- `UNAUTHORIZED` - ошибка авторизации
- `FORBIDDEN` - ошибка доступа
- `NOT_FOUND` - ресурс не найден
- `VALIDATION_ERROR` - ошибка валидации
- `RPC_VALIDATION_ERROR` - ошибка валидации RPC

### UserFromContext

Интерфейс пользователя из контекста запроса.

**Расположение:** `src/types/context-types.ts`

```typescript
interface UserFromContext {
    id?: string | number;
    email?: string;
    roles?: string[];
    permissions?: string[];
    [key: string]: unknown;
}
```

### FileValidationOptions и FileValidationResult

Типы для валидации файлов.

**Расположение:** `src/types/file-validation-types.ts`

```typescript
interface FileValidationOptions {
    maxSize?: number; // Максимальный размер в байтах
    allowedMimeTypes?: string[]; // Разрешенные MIME типы
    allowedExtensions?: string[]; // Разрешенные расширения файлов
}

interface FileValidationResult {
    isValid: boolean;
    errors: string[];
}
```

### CircuitBreakerState и CircuitBreakerOptions

Типы для Circuit Breaker.

**Расположение:** `src/types/circuit-breaker-types.ts`

```typescript
enum CircuitBreakerState {
    CLOSED = "CLOSED", // Нормальная работа
    OPEN = "OPEN", // Разомкнут (ошибки превысили порог)
    HALF_OPEN = "HALF_OPEN", // Полуоткрыт (тестирование восстановления)
}

interface CircuitBreakerOptions {
    failureThreshold?: number; // Порог ошибок для открытия
    successThreshold?: number; // Порог успешных запросов для закрытия
    timeout?: number; // Время ожидания в открытом состоянии (мс)
    resetTimeout?: number; // Время до перехода в HALF_OPEN (мс)
}
```

### CorsOptionsConfig

Тип для настройки CORS.

**Расположение:** `src/types/cors-types.ts`

```typescript
interface CorsOptionsConfig {
    origin?: string | string[] | boolean | RegExp | ((origin: string) => boolean);
    methods?: string | string[];
    allowedHeaders?: string | string[];
    exposedHeaders?: string | string[];
    credentials?: boolean;
    maxAge?: number;
    preflightContinue?: boolean;
    optionsSuccessStatus?: number;
}
```

### CompressionOptionsConfig

Тип для настройки compression.

**Расположение:** `src/types/compression-types.ts`

```typescript
interface CompressionOptionsConfig {
    filter?: (req: Request, res: Response) => boolean;
    level?: number;
    threshold?: number;
    chunkSize?: number;
    windowBits?: number;
    memLevel?: number;
    strategy?: number;
    dictionary?: Buffer | Buffer[] | string;
}
```

### VersioningOptionsConfig

Тип для настройки версионирования API.

**Расположение:** `src/types/versioning-types.ts`

```typescript
type VersioningStrategy = "uri" | "header" | "media-type";

interface VersioningOptionsConfig {
    type: VersioningStrategy;
    defaultVersion?: string;
    header?: string;
    key?: string;
}
```

### GetServicePathOptions

Тип для опций функции getServicePath.

**Расположение:** `src/types/get-service-path-types.ts`

```typescript
type ServicePathType = "locales" | "srcRoot" | "file";

interface GetServicePathOptions {
    serviceName: string;
    dirname: string;
    pathType: ServicePathType;
    relativePath: string;
}
```

### MulterFile

Тип файла Multer.

**Расположение:** `src/types/file-types.ts`

```typescript
interface MulterFile {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
    destination: string;
    filename: string;
    path: string;
    stream: NodeJS.ReadableStream;
}
```

---

## 🚨 Классы ошибок (дополнительные)

### NestCommonError

Базовый класс ошибок пакета nest-common для внутренних ошибок пакета.

**Расположение:** `src/errors/nest-common.error.ts`

**Наследование:** `Error`

**Особенности:**
- Используется для внутренних ошибок пакета
- Сохраняет оригинальную ошибку для логирования
- Корректно работает с `instanceof`

**Использование:**

```typescript
import { NestCommonError } from "@packages/nest-common";

throw new NestCommonError("Internal package error", originalError);
```

---

## 📖 Использование

### HTTP контроллер (api-service)

```typescript
import { Controller, Get } from "@nestjs/common";
import { BaseController } from "@packages/nest-common";
import { LoggerService } from "@makebelieve21213-packages/logger";

@Controller("analytics")
export default class AnalyticsController extends BaseController {
    constructor(
        private readonly analyticsService: AnalyticsService,
        logger: LoggerService,
    ) {
        super(logger);
    }

    @Get("global")
    async getGlobal() {
        // БЕЗ try-catch - глобальный фильтр все обработает
        return await this.analyticsService.getGlobalData();
    }
}
```

### RPC контроллер (analytics-service)

```typescript
import { Controller } from "@nestjs/common";
import { MessagePattern, Payload, Ctx } from "@nestjs/microservices";
import { BaseController } from "@packages/nest-common";
import { LoggerService } from "@makebelieve21213-packages/logger";

@Controller()
export default class AnalyticsController extends BaseController {
    constructor(
        private readonly analyticsService: AnalyticsService,
        logger: LoggerService,
    ) {
        super(logger);
    }

    @MessagePattern(ROUTING_KEYS.ANALYTICS_GLOBAL)
    async getGlobalData(
        @Payload() _: GlobalDataIncomeDto,
        @Ctx() ctx: RmqContext,
    ): Promise<GlobalDataOutcomeDto> {
        // БЕЗ try-catch - глобальный фильтр все обработает
        const data = await this.analyticsService.getGlobalData();
        this.acknowledge(ctx);
        return data;
    }
}
```

### WebSocket Gateway (api-service)

```typescript
import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { SocketError } from "@packages/nest-common";
import { SOCKET_EVENTS } from "@packages/types";

@WebSocketGateway()
export default class SocketGateway extends BaseGateway {
    @WebSocketServer()
    io!: Server;
    
    async publish(userId: string, event: SOCKET_EVENTS, payload: unknown) {
        try {
            await this.io.timeout(5000).to(`user:${userId}`).emitWithAck(event, payload);
        } catch (error) {
            const socketError = SocketError.fromUnknown(error);
            
            // Логирование
            this.logger.error(`Ошибка отправки события: ${socketError.message}`);
            
            // Сохранение в Redis
            await this.redisService.hSet(REDIS_H_KEYS.SOCKET_ERROR, userId, socketError.message);
            
            // Опционально: отправка на фронт
            await this.io.to(`user:${userId}`).emit(SOCKET_EVENTS.ERROR, {
                status: "error",
                message: socketError.message,
            });
            
            throw socketError;
        }
    }
}
```

---

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

### 3. Отправляйте ошибки на фронт через Socket.io

```typescript
// ✅ ХОРОШО - отправка ошибки на фронт
try {
    await this.processData();
} catch (error) {
    await this.socketGateway.publish(
        userId,
        SOCKET_EVENTS.ERROR,
        {
            status: "error",
            message: error.message,
        },
    );
}
```

### 4. Не преобразуйте ошибки вручную в контроллерах

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

### 5. Используйте правильный тип ошибки для контекста

```typescript
// HTTP контекст → HttpError (автоматически через UnifiedExceptionFilter)
// RPC контекст → RpcError (автоматически через UnifiedExceptionFilter)
// Socket контекст → SocketError (вручную в SocketGateway.publish())
```

---

## 🔍 Обработка ошибок WebSocket

### Типы ошибок WebSocket

1. **Ошибки отправки событий** - обрабатываются через `SocketError` в `SocketGateway.publish()`
2. **Ошибки подключения** - обрабатываются автоматически Socket.io (событие `disconnect`)
3. **Внутренние ошибки сервера** - логируются, опционально отправляются на фронт через событие `ERROR`

### Отправка ошибок на фронт

```typescript
// В сервисе при возникновении ошибки
await this.socketGateway.publish(
    userId,
    SOCKET_EVENTS.ERROR,
    {
        status: "error",
        message: "Произошла ошибка при обработке данных",
    },
);
```

### Обработка на фронтенде

```typescript
socket.on(SOCKET_EVENTS.ERROR, (payload, ack) => {
    // Останавливаем загрузки
    setLoadingGlobal(false);
    
    // Устанавливаем критическую ошибку
    useGlobalStore.setState({ criticalError: payload.message });
    
    // Подтверждаем получение
    ack({ status: "received", ts: Date.now() });
});
```

### Внутренние ошибки Socket.io

Внутренние ошибки (подключение/отключение) обрабатываются автоматически:

- **Ошибка подключения** → Socket.io разрывает соединение, фронт получает событие `disconnect`
- **Ошибка отключения** → Socket.io очищает соединение, фронт получает событие `disconnect`
- **Таймаут соединения** → Socket.io автоматически переподключается, фронт получает событие `reconnect`

---

## 🧪 Тестирование

Пакет имеет высокое покрытие тестами (>95% для веток, 100% для statements и функций).

```bash
# Запуск тестов
pnpm test

# Запуск тестов с покрытием
pnpm test:coverage
```

**Покрытие тестами:**
- Statements: 100%
- Branches: 95.45%
- Functions: 100%
- Lines: 100%

**Тестовые сценарии:**
- Все классы ошибок (HttpError, RpcError, SocketError, NestCommonError)
- Глобальные фильтры (UnifiedExceptionFilter, HttpExceptionFilter, RpcExceptionFilter, WebSocketExceptionHandler)
- Перехватчики (UnifiedInterceptor, HttpLoggingInterceptor, RpcLoggingInterceptor, WebSocketLoggingInterceptor, ResponseInterceptor, SerializeInterceptor, CompressionInterceptor, RequestIdResponseInterceptor)
- Пайпы валидации (HttpValidationPipe, RpcValidationPipe, FileValidationPipe, QueryValidationPipe, HeaderValidationPipe)
- Guards (JwtAuthGuard, ApiKeyGuard, RolesGuard, PermissionsGuard, RateLimitGuard, WebSocketAuthGuard)
- Декораторы (Public, Roles, Permissions, ApiKey, Serialize)
- Базовые классы (BaseController)
- Утилиты (validateEnv, getUserFromContext, getIpFromContext, getUserAgentFromContext, getRequestIdFromContext, createCorsOptions, createCompressionOptions, createVersioningOptions, validateFile, getFileExtension, formatFileSize, CircuitBreakerService, getServicePath)
- Преобразование ошибок между контекстами
- Обработка граничных случаев и различных типов ошибок
- Логирование HTTP, RPC и WebSocket запросов с метриками времени выполнения
- Валидация файлов, query параметров и заголовков
- Авторизация и аутентификация через guards
- Rate limiting и circuit breaker паттерны

## 📚 Дополнительные ресурсы

- [NestJS Exception Filters](https://docs.nestjs.com/exception-filters)
- [NestJS Microservices](https://docs.nestjs.com/microservices/basics)
- [Socket.io Error Handling](https://socket.io/docs/v4/error-handling/)

## 📦 Установка

```bash
pnpm add @makebelieve21213-packages/nest-common
```

Или добавьте в `package.json` вашего микросервиса:
```json
{
  "dependencies": {
    "@makebelieve21213-packages/nest-common": "workspace:*"
  }
}
```

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
pnpm install

# Сборка
pnpm build

# Запуск тестов
pnpm test

# Запуск тестов с покрытием
pnpm test:coverage

# Линтер
pnpm lint
pnpm lint:fix

# Форматирование
pnpm format
pnpm format:fix
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
- **pnpm**: >=10.18.0
- **@nestjs/common**: ^11.1.6
- **@nestjs/microservices**: ^11.1.3
- **rxjs**: ^7.8.2

## 📝 Лицензия

MIT License - см. файл [LICENSE](LICENSE) для деталей.

## 🤝 Contribution

Pull requests приветствуются! Для крупных изменений, пожалуйста, сначала откройте issue для обсуждения.
