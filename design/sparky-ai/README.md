# Sparky AI — n8n build guide

A retrieval-augmented (RAG) coaching agent that talks in Adi's voice and is
grounded in IGNTD's own content: your books, lessons, workshops, and past-session
transcripts. It can converse, propose lessons, and generate new session/exercise
ideas.

## The stack
| Piece | Choice | Why |
|---|---|---|
| Brain (LLM) | **Claude (Anthropic)** | Warmth, nuance, safety for a recovery context |
| Embeddings | **OpenAI `text-embedding-3-small`** | Cheap, standard, native pgvector support |
| Knowledge base | **Your Postgres + pgvector** | Reuses the DB you already have |
| Chat memory | **Postgres Chat Memory** | Same DB, keyed by `sessionId` |

**You'll need:** an Anthropic API key, an OpenAI API key, and your Postgres
connection details. The app itself needs **no code changes** — it already sends
`chatInput`/`sessionId` and reads the agent's `output`.

---

## Architecture — two workflows

### Workflow 1 — the live chat agent (build this first)
```
Webhook (POST, CORS) ──main──▶ Sparky Agent ──▶ (responds to the app)
                                   ▲  ▲  ▲
              Claude (LLM) ────────┘  │  └──── Knowledge Base (pgvector tool)
              Postgres Memory ───────-┘                     ▲
                                              OpenAI Embeddings (ai_embedding)
```
The agent searches the knowledge base on each turn, remembers the conversation
by `sessionId`, and answers in Adi's voice. Import `chat-agent.workflow.json`
to get this pre-wired.

### Workflow 2 — content ingestion (build this second)
Loads your content into `sparky_documents` as searchable vectors:
```
Source (DB query / file / transcript) ──▶ Split into chunks ──▶ OpenAI Embeddings ──▶ Postgres pgvector (insert)
```
You run this whenever you add content. Details in **Ingestion** below.

---

## Setup — step by step

### 0. Prep Postgres
Run `schema.sql` against your database (enables `pgvector`, creates
`sparky_documents`). The one essential line is `CREATE EXTENSION vector;`.

### 1. Import the chat agent
In n8n: **Workflows → Import from File →** `chat-agent.workflow.json`.

### 2. Wire credentials (nodes marked `REPLACE`)
Open each and pick your saved credential:
- **Claude (Anthropic)** → your Anthropic API key. Confirm the model id is one
  your key can use (e.g. a current Claude Sonnet).
- **OpenAI Embeddings** → your OpenAI API key.
- **Postgres Chat Memory** and **Knowledge Base (pgvector)** → your Postgres.

### 3. Paste the system prompt
Open **Sparky Agent → Options → System Message** and paste all of
`system-prompt.md`.

### 4. CORS + activate (this is what bit us before)
- **Webhook node → Options → Allowed Origins (CORS):** exactly
  `https://adij-76.github.io` (no leading `*`, no trailing slash). Already set in
  the JSON, but verify after import.
- **Respond:** "When Last Node Finishes" (already set).
- **Save**, then toggle the workflow **Active → off → on** so the production
  webhook re-registers with the CORS setting.

### 5. Point the app at the new webhook
The new workflow has a **new production URL**
(`https://igntd.app.n8n.cloud/webhook/<new-id>`). Easiest path — no code change:
set the GitHub repo **variable** `SPARKY_WEBHOOK` to that URL
(*Settings → Secrets and variables → Actions → Variables*). The deploy already
injects it. Re-run the deploy (or push any commit) and Sparky will call the new flow.

### 6. Test
Send a message in Sparky. You should get a grounded, in-voice reply. If the
knowledge base is still empty, the agent will say it doesn't have specific
material yet and fall back to general support — that's expected until Workflow 2
has run.

---

## Ingestion — getting your content in

Your content is a mix, and each type has a path into `sparky_documents`:

| Source | How it gets in |
|---|---|
| **Lessons / workshops in Postgres** | A node queries the relevant tables → chunk → embed → insert. Fastest win since it's already in the DB. |
| **Text / Markdown / Google Docs** | Read the doc → chunk → embed → insert. |
| **PDFs / Word docs (books)** | Extract text (n8n "Extract from File" / a PDF step) → chunk → embed → insert. |
| **Video / audio sessions** | Transcribe first (OpenAI Whisper or AssemblyAI) → chunk → embed → insert. Transcripts also teach the agent your phrasing. |

**Chunking:** ~800–1,200 characters per chunk with ~100 overlap works well.
Store useful `metadata` per chunk (`{ "type": "workshop", "title": "...",
"source": "..." }`) so the agent can cite and you can filter later.

**Two ways to "learn your style":**
1. Embed full session transcripts → the agent retrieves and mirrors your actual
   wording.
2. (Optional, stronger) Distill a one-page *style guide* from a few transcripts
   and append it to the system prompt.

I'll build the ingestion workflow once I know your Postgres layout (see below).

---

## What I need from you to build Workflow 2
1. **Postgres schema** for the content you want indexed first — which tables/
   columns hold lessons and workshops? (e.g. `lessons(id, title, body, ...)`).
   A quick `\d lessons` / `\d workshops` dump is perfect.
2. Confirm you have (or can create) the **Anthropic** and **OpenAI** API keys.
3. Where the **books/PDFs** and **session recordings** live (Drive, S3, local).

Once I have #1, I'll add `ingestion.workflow.json` here, pre-wired to your tables.

---

## Files in this folder
- `system-prompt.md` — Sparky's voice/role prompt (paste into the agent).
- `schema.sql` — pgvector + table setup (run once).
- `chat-agent.workflow.json` — importable Workflow 1.
- `README.md` — this guide.
