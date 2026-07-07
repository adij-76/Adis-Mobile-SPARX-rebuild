# Method Corpus — Adi Jaffe / IGNTD canonical method library

The repository-based, migration-proof home for the methods that power Sparky's
voice and the recommendation engine's clinical grounding. **This folder is the
source of truth**; databases and vector stores are downstream copies. Because
it lives in git, it survives any database migration, and every change to the
method content is a reviewable diff.

## How it flows into the product

```
design/method-corpus/*.md  ──(ingestion workflow: chunk → embed)──▶ vector store
        │                                                            (ai_documents /
        └──(distilled)──▶ "Adi Method & Voice" core ──▶ ai_prompts    successor)
                           (Sparky system prompt v2)
```

Two consumption paths: the **distilled voice core** goes into the Sparky
system prompt (always in context), while the **full documents** get embedded
for retrieval (pulled when relevant).

## Captured so far

| File | Source | Status |
|---|---|---|
| `01-sparo-framework.md` | Drive: "DOCUMENT 1 – SPARO FRAMEWORK: CORE CONCEPTS" | ✅ captured 2026-07-06 |
| `02-transference-projection.md` | Drive: "DOCUMENT 2 – TRANSFERENCE & PROJECTION" | ✅ captured 2026-07-06 |
| `03-somatic-emotional-fingerprint.md` | Drive: "DOCUMENT 3 – SOMATIC & EMOTIONAL FINGERPRINT MAP" | ✅ captured 2026-07-06 |
| `04-core-fears-catastrophic-stories.md` | Drive: "DOCUMENT 4 – CORE FEAR & CATASTROPHIC STORY TEMPLATES" | ✅ captured 2026-07-06 |
| `05-unhooked-eat-overview.md` | Drive: "DOCUMENT 5 – UNHOOKED / EAT OVERVIEW (FOR THIS TOOL)" | ✅ captured 2026-07-06 |
| `06-unhooked-framework-full.md` | Drive: `unhooked-framework-UPDATED.md` (87KB) — full Unhooked framework, verbatim | ✅ captured 2026-07-07 |
| `07-unhooked-method-system-notes.md` | Drive: Unhooked-Method-System folder (practitioner manual v0.2, research brief, strategy, biases/belief buckets) + Book 3 inventory | ✅ captured 2026-07-07 |
| `10-adi-voice-source-notes.md` | Drive: writing-skill file + PT playbook + 5 articles — voice rules, patterns, verbatim exemplars | ✅ captured 2026-07-07 |
| `20-adi-method-voice-core.md` | Distilled from 01–07 + 10 — **prompt-ready voice core for Sparky** (`ai_prompts` 254436) | ✅ drafted 2026-07-07 |
| `90-drive-inventory.md` | Full triaged inventory of both Drive trees (~460 files) with high-value flags | ✅ captured 2026-07-07 |

## Collection backlog (the "make Sparky truly Adi" list)

| Source | Where it lives | How to get it in |
|---|---|---|
| **Unhooked** (full manuscript) | Drive: "Unhooked consolidated book - all changes accepted…" | Distill key chapters here + full text to vector store (book may already be in `ai_documents` — verify) |
| **The Abstinence Myth** (book) | reportedly in `ai_documents` vector table | Verify coverage via corpus census |
| **Unhooked book exercises** | Drive: "Unhooked book exercises.docx" + "Unhooked Exercises" sheet | Capture → future exercises library + Sparky in-chat toolkit |
| ~~OneDrive method folders~~ | migrated to Google Drive ("speaking and consulting", "writing and publishing") | ✅ inventoried in `90-drive-inventory.md`; key files captured in 06/07/10 |
| **"How to Become Unhooked" workshop** | recording/transcript NOT in the two Drive trees. Found elsewhere in Drive: `Workbook - How to Get Truly Unhooked Live Workshop with Dr. Adi Jaffe.pdf` (parent folder id `1Gmp1gUk_yeOvf8l8Vwp9w5abvczMv2vL`) | Capture workbook; Adi to locate the recording/transcript |
| **"Perfect Life Blueprint" workshop** | not in the two trees. Related find: `L3 E1 Your Perfect Day.pdf` (2021 course, parent id `1u-JGqDJ3E8tPQqnxMAd3qpD_lCiL2w3V`) | Adi to point at the course folder; then capture |
| **Book 3 method files** | Drive: Book3-Unhooked-Leadership (`Pattern-Behavior-Map.md`, `Avoidance-Tax-Knowledge-Base.md`, 2 workshop outlines) + old business presentations (workshop/keynote PDFs) | Next capture pass |
| **Jaffe Method Compendium + Decade-in-90-Days manual** | Drive: Coaching/Templates | Next capture pass |
| **Course work** | TBD | Same |
| **Best articles** | Adi to send links/text | Capture as markdown here + embed |
| **Podcast appearances** (voice gold) | Adi to send links | Transcribe best segments → voice-sample file |
| **Voice samples** (Adi at his best, any format) | Adi to send | Feeds the "Adi Method & Voice" prompt core |

## House rules

1. **Faithful capture:** documents are transcribed as-authored (light
   formatting cleanup only). Interpretation happens in the distilled voice
   core, never by editing sources.
2. **Provenance:** every file states its source and capture date.
3. **Additions land here first**, then get embedded — never the other way
   around.
