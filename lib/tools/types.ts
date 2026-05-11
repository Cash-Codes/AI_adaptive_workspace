import { z } from "zod";

export type ToolRunMode = "snapshot" | "live";

export type ToolContext = {
  githubToken?: string;
};

export type Tool<TInput = unknown, TOutput = unknown> = {
  name: string;
  description: string;
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
  execute(input: TInput, ctx: ToolContext): Promise<TOutput>;
};

export const SnapshotEntrySchema = z.object({
  arguments: z.unknown().refine((v) => v !== undefined, {
    message: "arguments is required (may be empty object but not undefined)",
  }),
  result: z.unknown(),
});
export type SnapshotEntry = z.infer<typeof SnapshotEntrySchema>;

export const SnapshotSchema = z.record(z.string(), z.array(SnapshotEntrySchema));
export type Snapshot = z.infer<typeof SnapshotSchema>;
