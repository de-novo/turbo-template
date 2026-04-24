import { z } from "zod";

export const paginationParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const pageInfoSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export const paginatedSchema = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    pageInfo: pageInfoSchema,
  });

export type PaginationParams = z.infer<typeof paginationParamsSchema>;
export type PageInfo = z.infer<typeof pageInfoSchema>;
export type Paginated<T> = {
  items: T[];
  pageInfo: PageInfo;
};
