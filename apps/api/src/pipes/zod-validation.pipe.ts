import { type ArgumentMetadata, Injectable, type PipeTransform } from "@nestjs/common";
import { AppError } from "@repo/platform";
import type { z } from "zod";

@Injectable()
export class ZodValidationPipe<TSchema extends z.ZodType> implements PipeTransform {
  constructor(private readonly schema: TSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata): z.infer<TSchema> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new AppError({
        code: "BAD_REQUEST",
        message: "Request validation failed.",
        details: { issues: result.error.issues },
      });
    }
    return result.data;
  }
}
