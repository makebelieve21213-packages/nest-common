# Changelog

Все значимые изменения в этом проекте будут документироваться в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/),
и этот проект придерживается [Semantic Versioning](https://semver.org/lang/ru/).

## [1.1.4] - 2026-02-14

### Добавлено
- Декоратор `@User()` для получения `req.user` в хендлерах контроллера с поддержкой generic-типа (`@User<MyUserType>()`)

### Изменено
- Prettier: команды `format` и `format:fix` теперь проверяют/форматируют весь проект (`.` вместо `src/**/*.ts`)
- .prettierignore: добавлены исключения для `*.json` и `*.config.ts`

### Удалено
- Dependabot (`.github/dependabot.yml`)

## [1.1.3] - 2025-11-24

### Изменено
- Обновлена зависимость @makebelieve21213-packages/logger с версии 1.0.5 до 1.0.7

## [1.1.2] - 2025-11-24

### Исправлено
- Исправлена конфигурация Dependabot: поле `day` в расписании изменено с числового значения на строковое (monday)

## [1.1.1] - 2025-11-24

### Изменено
- Обновлены Git hooks (pre-commit и pre-push) с проверкой результатов выполнения команд
- Сокращена документация llms.txt для более быстрого анализа проекта ИИ
- Сокращен README.md до 500-600 строк для улучшения читаемости
- Заменены все упоминания реальных сервисов на тестовые/общие названия в документации
- Обновлена документация: заменены упоминания pnpm на npm в README

### Исправлено
- Git hooks теперь корректно останавливают коммит/push при ошибках выполнения команд

## [1.1.0] - 2025-11-20

### Добавлено
- JsonRpcException - класс исключений для JSON-RPC 2.0 протокола
- JsonRpcExceptionFilter - фильтр для обработки исключений в формате JSON-RPC 2.0
- JsonRpcValidationPipe - пайп для валидации JSON-RPC 2.0 запросов
- Типы JsonRpcRequest и JsonRpcResponse для работы с JSON-RPC протоколом
- Коды ошибок JSON-RPC 2.0 (JsonRpcErrorCode) с маппингом HTTP статусов
- Утилиты для работы с JSON-RPC ошибками (mapHttpStatusToJsonRpcErrorCode, getErrorStatus)
- Полное покрытие тестами для всех новых классов

## [1.0.1] - 2025-11-19

### Исправлено
- Исправлены пути к файлам сборки в package.json

## [1.0.0] - 2025-11-19

### Добавлено
- Базовая функциональность для NestJS микросервисов
- Guards: JWT Auth, Roles, Permissions, API Key, Rate Limit, WebSocket Auth
- Interceptors: Response, Serialize, Compression, HTTP/RPC/WebSocket Logging, Request ID Response
- Filters: HTTP, RPC, WebSocket, Unified Exception Handlers
- Decorators: Public, Roles, Permissions, Serialize, API Key
- Pipes: HTTP/RPC Validation, Query/Header/File Validation
- Base Controller с общими методами
- Утилиты: Circuit Breaker, Compression, Context, CORS, File, Versioning, Env Validator
- Полная типизация TypeScript
- 100% покрытие тестами

### Документация
- Подробный README с примерами использования
- llms.txt для контекста ИИ агентов
- Инструкции по развертыванию в Docker
- Руководство по внесению вклада (CONTRIBUTING.md)
