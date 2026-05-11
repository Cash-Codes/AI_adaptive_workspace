import { promises as fs } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { EventSchema } from "@/lib/events";

export const RunMetadataSchema = z.object({
  id: z.string(),
  created_at: z.number(),
  workflow: z.string(),
  base_run_id: z.string().optional(),
  fork_point: z.object({ event_id: z.string() }).optional(),
});
export type RunMetadata = z.infer<typeof RunMetadataSchema>;

export const RunSchema = z.object({
  metadata: RunMetadataSchema,
  events: z.array(EventSchema),
});
export type Run = z.infer<typeof RunSchema>;

export class JsonRunStore {
  constructor(private rootDir: string) {}

  private async ensureDir(): Promise<void> {
    await fs.mkdir(this.rootDir, { recursive: true });
  }

  private pathFor(runId: string): string {
    return join(this.rootDir, `${runId}.json`);
  }

  async write(run: Run): Promise<void> {
    await this.ensureDir();
    await fs.writeFile(
      this.pathFor(run.metadata.id),
      JSON.stringify(run, null, 2),
      "utf8"
    );
  }

  async read(runId: string): Promise<Run> {
    const content = await fs.readFile(this.pathFor(runId), "utf8");
    return RunSchema.parse(JSON.parse(content));
  }

  async list(): Promise<RunMetadata[]> {
    await this.ensureDir();
    const files = await fs.readdir(this.rootDir);
    const metas: RunMetadata[] = [];
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      const content = await fs.readFile(join(this.rootDir, f), "utf8");
      const parsed = JSON.parse(content);
      metas.push(RunMetadataSchema.parse(parsed.metadata));
    }
    return metas.sort((a, b) => b.created_at - a.created_at);
  }
}
