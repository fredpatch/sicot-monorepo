CREATE TABLE "courriers_criticite_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"normal" integer NOT NULL,
	"a_surveiller" integer NOT NULL,
	"critique" integer NOT NULL,
	"total_en_attente" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "courriers_criticite_snapshots_date_unique" UNIQUE("date")
);
