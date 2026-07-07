# QA review — `conversational_segments_vectors` (legacy DB)

**Reviewed:** all 202 rows, 2026-07-07, from six paged exports.
**Verdict: keep 86, remove 116.** The removals are not "bad therapy" for the
most part — they're rows that can't work as retrieval training examples.

## How this table is used (why the bar is what it is)

The chatbot's program-data agent searches this table with the **client's text
as the vector key** and surfaces the **coach's response** as a pattern to
imitate. A row earns its place only if (1) the client text is a meaningful
search key, (2) the coach response models something worth imitating, and
(3) nothing in it identifies a person or leaks internal operations.

## Removal categories

### A. Unsearchable filler keys (~45 rows)
Client text is "Okay." / "Yep." / "Yeah." / "Mmm." / "For sure." etc. These
can never be retrieved for the right reason — an embedding of "Okay." matches
nothing meaningful. **Several of these carry gold coach content** (habit
stacking, the self-blame/denial balance, "do tonight, show up present", the
stress thermometer) — that content should come back via re-ingestion with
windowed chunks (see "Systemic fixes"), not sit behind a dead key.

### B. Operations / business / tech-support calls (~35 rows)
Whole transcripts (5506, 5537, 5491-partial, 5344-partial, 5385) are staff
or partner-org conversations: group attendance, grant phone redistribution,
Zoom settings, meeting hosting, coach recruitment, program logistics. Not
coaching examples, and they name staff/partners (Patty, Jim, Franklin,
Pierce, Allison, Ms. Williams) and internal program details. One
(73d19993) also has the coach's words mislabeled as client text and
mentions company finances.

### C. Duplicates (~10 rows)
The "bookshelf/improvise" exchange appears 5×, the "nosebleed bravery"
exchange 5× (kept the best one, c7cce9ad), and meta id 5360 ("own best
friend") twice (kept the fuller f6754480).

### D. Privacy / identifying detail (~8 rows)
Wisconsin OWI court + governor pardon + DMV timeline (2d4e6a6f); named
Seattle clinic + block-house housing history (5a2d2517, acede2c8); rare
blood-cancer family narratives (500d09b4, 9539bf42); probation dates
(9618587d, 302d23d2). Compelling stories, but too identifying for a shared
retrieval pool.

### E. Quality/safety problems (~18 rows)
Garbled transcription ("Blood. Not be heaven.", "First the degree boss…"),
speaker-role mislabeling (client/coach swapped: 8e798c82, ed84f24d,
f233cc75, 73d19993), a client slur left verbatim (32017299), a muddled
comment about enforced-abstinence testing (5cf4266f), and a coach response
that knocks AA meetings as "clicky" (d9bde456) — honest in context, wrong
as a reusable pattern.

## KEEP — 86 rows

Strong therapeutic exemplars: boundaries and codependency work (transcript
5353 is the richest source), harm reduction and MAT destigmatization,
grief/transition, masking distress, self-worth vs productivity, presence and
one-day-at-a-time grounding, urge/trigger self-monitoring, empowerment.

```
030790ac 11474ca8 16e85015 18c7b465 19846d1e 1d948c3e 1dc6482f 1e06d2d3
1e2f507e 21963c17 234af194 242c3e10 2a672ab7 2a9c94e5 2d317ee6 33e4e71d
34ad99be 34fd92ac 35c68f26 365e1c58 3d5a23f2 3e3b4bbb 42da79ec 47626da6
47ac5ec4 49eb1a17 535fba33 5591444d 56d4482e 5cdf52d0 61b075d7 61b500e0
61fe8890 635e26c3 696dd97f 6c4773c9 6fe661be 7310a750 76e1f218 7bd86a71
7f3418a1 800c1476 852d2c4a 86d3af7c 8e8d6ab5 90915e86 94360f65 9973d069
9afe7b1f 9bd99018 9c681d37 9e47ed5c 9e4c7ce8 a5932cb3 a7ff08bd a8a8ea82
aaa5dc9b ab24dbfa ae007da4 aea453f2 b15754c3 b3887b2b b63de01f ba797c91
baef200b bbb6c0ce c33d91c6 c35845bf c7cce9ad d1455b51 d379402e d3db5b21
d62c6bdf d845698c e13482d6 e408a30f e495f123 e798b4f6 ea745b2e ef5ece20
eff20d2e f613cda0 f6754480 faa4be65 fc9d3bcb fe98b5d6
```

## The SQL (run on the LEGACY DB, in this order)

**Step 1 — backup (run once, before anything):**
```sql
create table conversational_segments_vectors_bak_20260707 as
select * from conversational_segments_vectors;
```

**Step 2 — delete the 116:**
```sql
delete from conversational_segments_vectors
where id in (
'02427f1f-e4cf-44a9-8c33-f43bc0d99ccf','02558d57-5881-41dd-ac67-149746304713',
'058ce9b5-a5c5-4731-b690-601742d77b51','0742d156-3586-41e8-9450-16d7de30bd5c',
'088417e2-620c-4957-a324-bd5d6a0197fe','0b8b648c-ba0b-4bfe-b370-2ce2c31a55c1',
'0df51493-53e9-4bac-91dc-60f7c0225c83','0e99560c-03b0-454c-84a4-9d033cf5cfda',
'0fbe4992-8969-415d-b0d3-dd697ee50c47','129809c9-6d68-49ae-9f83-48e99faf3d3d',
'12c02871-55ed-4080-a806-d14586e0d506','12f0f684-c7c7-4a73-96c2-9a799bb49e52',
'13144a9f-8883-470a-9f1a-c66526dcbd1a','172d6b12-2031-4fce-aaba-ba573296f125',
'19ea9399-8dd1-49ea-a4ed-c23784b4043d','1b84d853-5713-4efa-8263-d67b341f13e0',
'1df1d1a9-4297-49e5-a32f-f64eec657472','21fc5bf7-c570-4db7-8509-8d39c5661471',
'2273070f-75a2-4567-bf31-c324e2415f6c','23926172-9235-4f92-94ed-e61d4dd6fb2f',
'243f944b-226d-4853-9cc2-ee7d9be1bf6a','24ae4789-bc1e-4d43-a0b5-070e60d1da85',
'25bdce9d-7307-453d-82a0-eb25f119b35e','2cc1de20-ed91-4b74-af86-6a6eb6edfacf',
'2d4e6a6f-b677-44a1-b6c2-545268164f60','302d23d2-eeb8-40c3-9c6a-ff00b9980b86',
'30b720e7-ff1f-44bf-a4ab-7d096fd38adf','316274f8-0a18-4179-9e49-3113bd839a3c',
'32017299-cb7f-4c66-a859-10e685d6c286','3308c77c-3a3b-4338-8d91-b396869c0d0a',
'33f2ee04-80ac-476a-b3c2-6c33c25444cc','349646ea-c3d4-4fad-9e54-e68683b8568f',
'3634f399-6a00-44eb-984d-882c52fcd021','3aa4bb42-7aa4-4cad-955b-639b459e564f',
'3ecc8055-4dc9-41f7-873d-1eae1364119e','41f8c735-4b74-4acc-b0ce-eb969ccf901b',
'48a78897-67aa-487d-a27f-3f66c9bd228f','4d028f99-dcd2-499d-9129-ccac66e0df02',
'4eaa2d5f-1f73-464c-ba8f-9838cd333176','4efd167e-1a60-4855-b0c3-595e6777040b',
'4fb1fef6-62f3-4c6c-b97f-f2ea775dbd0b','4fce2dfd-c6e6-48df-ae8f-ba3eadaae572',
'500d09b4-5a5e-449f-a524-596d60aca443','531112d4-7cb8-4344-87c9-c073f2916436',
'560dfa92-4687-4a80-9c88-137fe239441d','59e24fc9-e80a-4a0c-839a-2904dcc79d25',
'5a2d2517-edbc-4423-896b-082fb99e994a','5cf4266f-e93d-4540-92a2-9f6d894c179d',
'6171df15-daba-4dd7-b6c9-bdf1d3f7379f','6558cb99-3856-4719-80a5-399b68882abc',
'695d3f2d-8ab0-46eb-9131-3c246c577846','702d7692-fb2b-426b-8e12-db00b06d13fe',
'7034c12b-e8bc-46b4-b6f7-e9e3e8539f18','716e65ab-c72d-4df7-b51f-9d19cfcdbb43',
'73d19993-4c8f-4c8f-9641-91b35bda09da','742a167e-a1f8-497a-88e3-e85785cd32f0',
'74e6b601-f86d-40e7-9ef7-7c5a73256742','75957c8e-c8ba-4f7b-9d6e-7aa05a548777',
'75b57057-4c8f-4c8f-955a-beaa7c4e6d65','7606c36f-33f9-4958-9a8b-6e9d2cbb8b54',
'781efad2-fd7c-4b1d-8117-769758f5d215','7abc5dee-6bff-45af-9355-beaa7c4e6d65',
'7bce240c-71b9-453c-954f-548b99e99fbf','7d708330-1579-4b08-b89d-07e235f2b91b',
'811bfef6-43cc-4157-8afe-427acc806d35','8256c6eb-3c84-4216-957e-419b946d4508',
'83b5d185-6bb8-4d0a-9874-3b556a4ec5f5','85d6db12-7265-4c93-a3df-66c67f7a05cc',
'87262dbb-2335-4760-b84a-9eff8fce99d7','8c50401e-70a5-4b3b-bd74-e175a7114c21',
'8e798c82-681e-4793-96fe-be7528ff8652','8f7173cd-0cd2-4cd8-aa91-fd90880840d6',
'94232334-d463-4cd8-9945-c22622c386b8','9539bf42-b9b7-48c2-bfca-e6c23b9cc809',
'9618587d-0b55-4741-a3db-9602dd81d7a9','9852b313-988a-4732-8049-a5a266504755',
'9906e893-5f63-484f-af3d-b8301039694d','9aa9c7be-dc53-4add-8bc6-510a9093cc48',
'9c644249-91ad-4868-b0d8-6046d7da343d','a2441d99-d2cc-46ed-b214-1d3de7e789fe',
'a389ff7b-c684-455e-a6d2-5e248e19b251','a52d1ca6-60bd-403e-bc82-63c6f7020815',
'a6415b27-58fa-4355-a024-6f127c1900b7','a937a749-90cf-4c8d-96f3-51b01b4633e5',
'ab6d56e8-728d-425a-8aa0-c5736b0b76dc','acede2c8-4e64-4cd8-aeaf-0bd4adfd5a9e',
'adf017e8-fb22-4d98-9be7-c083f24f5107','af4770c8-291c-427a-96f1-7706457d370c',
'b03c0fc1-95ed-44b9-8610-eb30dcfb68ee','b221c0f0-db96-4a7f-be2c-5121a518f0e3',
'b3616340-257f-4c91-8005-7a7e2d054380','b61c7ac7-53d2-45bc-8b41-ebfcf9ffadd0',
'b8f9a7c0-2dc4-4b8e-8810-5427cef5d6b0','ba16f717-fb98-4ad1-99b0-86efcd1b956c',
'ba649828-7a4c-48c1-b579-2c2e209efd79','bcb83fa7-5d98-4935-a957-af1387e78d60',
'bdce5173-2226-467a-b3d7-b922d007b0e3','be31224d-c733-49d1-ab57-307d7363d225',
'c9f4b98b-2a74-43aa-9fcb-cb0f584941e5','cbc2c301-1139-4c9b-b221-cb26a5cc3a03',
'cf15a234-40f2-4308-a1bd-0cedea474811','d438443b-dbd6-46fc-8ea2-dfac966a247a',
'd9bde456-552d-4e80-8cf1-78eca278b2c6','df843ecc-f5df-4d03-b700-00ec74404ef7',
'e08941fb-5553-4b78-b6db-ae9007c53f57','eac3b8e8-35aa-47d8-875e-a0be2801aae7',
'eac4158f-94b8-402b-905b-92c09f20f9a8','ed8295f9-1818-4230-9a4f-cac5d1a40972',
'ed84f24d-381e-470c-997c-e5743a800158','f233cc75-4267-48ee-bfce-bc415e3790e4',
'f3484830-fe0a-4277-9617-e885e6a66b27','f5f8197a-5f7e-4fd1-9349-26ec9ba23cc0',
'f6e287ec-ad49-460e-bc27-c5d2b1890128','f810f8be-ac5c-4ddc-854e-142b11151343',
'f859ef5d-b110-4254-9e4f-e2d4217177dc','fe7b4819-58a1-4a98-b1bc-c09562015722'
);
-- expect: DELETE 116. Then verify:
select count(*) from conversational_segments_vectors;  -- expect 86
```

> ⚠️ Three ids in the exports were truncated in my source view
> (`3ecc8055…`, `73d19993…`, `75b57057…`). If the DELETE reports fewer than
> 116 rows, run:
> `select id from conversational_segments_vectors where text like 'I missed the bookshelf part%' or text like 'For some of us, We forget%' or text = 'Right.';`
> and delete those ids individually.

**Step 3 (recommended) — scrub first names from the keepers:**
Embeddings aren't affected (they were computed already and names carry little
weight), but this stops retrieved text from echoing a real client's name into
someone else's chat:
```sql
update conversational_segments_vectors
set text = regexp_replace(text, '\m(Debbie|Deb|Cindy|Brian|Dode|Franklin|Fred|Christine|Allison|Patty|Pierce)\M', '[name]', 'g'),
    metadata = regexp_replace(metadata::text, '\m(Debbie|Deb|Cindy|Brian|Dode|Franklin|Fred|Christine|Allison|Patty|Pierce)\M', '[name]', 'g')::jsonb;
-- expect: UPDATE 86
```

## Systemic fixes this review surfaced

1. **Re-ingest with windowed chunks.** ~45 rows died because the chunker
   keyed on a bare "Okay." Re-ingestion should use a window (client turn +
   prior coach turn as the key) so the coach's teaching moments are
   retrievable. The originals live in the transcripts (`transcript_id` is in
   every metadata row) — nothing is lost.
2. **The `ideal_repsonse` field (note the typo — it's misspelled in the data)
   is generic therapy-voice** — "That's wonderful!", "Thank you for
   sharing" — exactly the register the Adi voice core bans. The v2
   program-data prompt should tell the agent to prefer `coach_message` (the
   real response) and treat `ideal_repsonse` as a fallback summary.
3. **Speaker mislabeling** happens in at least 4 rows — worth a validation
   pass in any future ingestion (does client_text end with "?" while
   coach_message reads like disclosure, etc.).
4. **The corpus is 100% one style of session** (mostly a handful of coaches,
   heavy on program logistics). The best Adi-style material (transcripts
   5327, 5353, 5411) should be over-weighted in future ingestion, and
   Adi's group sessions ("Tuesday meeting") are the richest untapped source.
