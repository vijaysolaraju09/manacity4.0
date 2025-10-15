import type { Resolver } from 'react-hook-form';
import type { z } from 'zod';

type ResolverResult<TSchema extends z.ZodTypeAny> = Resolver<z.infer<TSchema>>;

type FieldError = { type: string; message: string };

type ErrorRecord = Record<string, FieldError>;

export const createZodResolver = <TSchema extends z.ZodTypeAny>(schema: TSchema): ResolverResult<TSchema> => {
  return async (values) => {
    const parsed = schema.safeParse(values);

    if (parsed.success) {
      return { values: parsed.data, errors: {} };
    }

    const formErrors = parsed.error.issues.reduce<ErrorRecord>((acc, issue) => {
      const path = issue.path.join('.') || issue.code;
      if (!acc[path]) {
        acc[path] = { type: issue.code, message: issue.message };
      }
      return acc;
    }, {});

    return {
      values: {},
      errors: formErrors,
    } as { values: unknown; errors: any };
  };
};

export default createZodResolver;
