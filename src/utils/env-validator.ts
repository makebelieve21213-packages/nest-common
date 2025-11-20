import Joi from "joi";
import NestCommonError from "src/errors/nest-common.error";

// Валидация переменных окружения с использованием Joi
export default function validateEnv(
	env: Record<string, string>,
	requiredKeys: string[]
): Record<string, string> {
	// Создаем схему для валидации на основе списка обязательных ключей
	const schemaFields = requiredKeys.reduce(
		(acc, key) => {
			acc[key] = Joi.string().required();
			return acc;
		},
		{} as Record<string, Joi.StringSchema>
	);

	const schema = Joi.object(schemaFields).unknown(true);

	const { error, value } = schema.validate(env, {
		abortEarly: false,
	});

	if (error) {
		const missingKeys = error.details
			.map((detail) => detail.context?.key)
			.filter((key): key is string => Boolean(key));

		throw new NestCommonError(`Missing env vars: ${missingKeys.join(", ")}`);
	}

	return value;
}
