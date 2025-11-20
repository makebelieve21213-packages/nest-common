# Changelog

Все значимые изменения в этом проекте будут документироваться в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/),
и этот проект придерживается [Semantic Versioning](https://semver.org/lang/ru/).

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

