import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export const transcriptions = sqliteTable("transcriptions", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => uuid()),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
  handoverid: text("handoverid"),
  transcription: text("transcription"),
  deid: text("deid"),
  prompt: text("prompt", { mode: "json" }).$type<{ foo: string }>(),
  llmresponse: text("llmresponse", { mode: "json" }).$type<{ foo: string }>(),
  llm: text("llm"),
  usage: text("usage", { mode: "json" }).$type<{ foo: string }>(),
});
