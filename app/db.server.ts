import { db } from "~/drizzle/config.server";
import { transcriptions } from "~/drizzle/schema.server";

import { desc, eq } from "drizzle-orm";

export async function addTranscription(
  transcription: string,
  deid: string,
  handoverid: string
) {
  return await db
    .insert(transcriptions)
    .values({
      transcription: transcription,
      deid: deid,
      handoverid: handoverid,
      llm: "gpt-4o-mini",
    });
}
export async function addLLMresponse(
  deid: string,
  transcription: string,
  prompt: string,
  llmresponse: string,
  llm: string,
  usage: string,
  handoverid: string
) {
  return await db
    .insert(transcriptions)
    .values({
      deid: deid,
      transcription: transcription,
      prompt: prompt,
      llmresponse: llmresponse,
      llm: llm,
      usage: usage,
      handoverid: handoverid,
    })
    .returning({ id: transcriptions.id });
}

export async function getTranscriptions(handoverid: string) {
  return await db
    .select()
    .from(transcriptions)
    .where(eq(transcriptions.handoverid, handoverid))
    .orderBy(desc(transcriptions.createdAt))
    .limit(1);
}
