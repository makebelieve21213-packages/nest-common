import { LoggerService } from "@makebelieve21213-packages/logger";
import { Injectable } from "@nestjs/common";
import { Observable } from "rxjs";
import HttpLoggingInterceptor from "src/interceptors/http-logging.interceptor";
import RpcLoggingInterceptor from "src/interceptors/rpc-logging.interceptor";
import WebSocketLoggingInterceptor from "src/interceptors/websocket-logging.interceptor";
import { ContextType } from "src/types/context-types";

import type { CallHandler, ExecutionContext, NestInterceptor } from "@nestjs/common";

// Единый глобальный перехватчик для логирования HTTP, RPC и WebSocket запросов
@Injectable()
export default class UnifiedInterceptor implements NestInterceptor {
	private readonly httpHandler: HttpLoggingInterceptor;
	private readonly rpcHandler: RpcLoggingInterceptor;
	private readonly wsHandler: WebSocketLoggingInterceptor;

	constructor(private readonly loggerService: LoggerService) {
		this.loggerService.setContext(UnifiedInterceptor.name);

		this.httpHandler = new HttpLoggingInterceptor(this.loggerService);
		this.rpcHandler = new RpcLoggingInterceptor(this.loggerService);
		this.wsHandler = new WebSocketLoggingInterceptor(this.loggerService);
	}

	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		// Получаем тип контекста
		const contextType = context.getType();

		switch (contextType) {
			case ContextType.HTTP:
				// Обрабатываем HTTP контекст
				return this.httpHandler.intercept(context, next);

			case ContextType.RPC:
				// Обрабатываем RPC контекст
				return this.rpcHandler.intercept(context, next);

			case ContextType.WS:
				// Обрабатываем WebSocket контекст
				return this.wsHandler.intercept(context, next);

			default:
				// Для неизвестных контекстов пропускаем запрос дальше
				return next.handle();
		}
	}
}
