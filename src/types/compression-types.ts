import type { Request, Response } from "express";

// Опции для настройки compression middleware
export interface CompressionOptionsConfig {
	filter?: (req: Request, res: Response) => boolean;
	level?: number;
	threshold?: number;
	chunkSize?: number;
	windowBits?: number;
	memLevel?: number;
	strategy?: number;
	dictionary?: Buffer | Buffer[] | string;
}

// Типы для compression middleware (если библиотека compression не установлена)
export interface CompressionOptions {
	filter?: (req: Request, res: Response) => boolean;
	level?: number;
	threshold?: number;
	chunkSize?: number;
	windowBits?: number;
	memLevel?: number;
	strategy?: number;
	dictionary?: Buffer | Buffer[] | string;
}
