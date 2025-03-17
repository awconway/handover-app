CREATE TABLE `transcriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	`handoverid` text,
	`transcription` text,
	`deid` text,
	`prompt` text,
	`llmresponse` text,
	`llm` text,
	`usage` text
);
