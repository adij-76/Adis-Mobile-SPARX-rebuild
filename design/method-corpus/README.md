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

## Collection backlog (the "make Sparky truly Adi" list)

| Source | Where it lives | How to get it in |
|---|---|---|
| **Unhooked** (full manuscript) | Drive: "Unhooked consolidated book - all changes accepted…" | Distill key chapters here + full text to vector store (book may already be in `ai_documents` — verify) |
| **The Abstinence Myth** (book) | reportedly in `ai_documents` vector table | Verify coverage via corpus census |
| **Unhooked book exercises** | Drive: "Unhooked book exercises.docx" + "Unhooked Exercises" sheet | Capture → future exercises library + Sparky in-chat toolkit |
| **OneDrive method folders** (2 shared links) | Adi's personal OneDrive | ⚠️ blocked by network policy — Adi to download folders as ZIP and upload into the Claude session |
| **"How to Become Unhooked" workshop** | recording/transcript TBD | Transcribe → distill + embed |
| **"Perfect Life Blueprint" workshop** | recording/transcript TBD | Transcribe → distill + embed |
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
