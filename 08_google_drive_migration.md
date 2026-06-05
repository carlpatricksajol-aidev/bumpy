# Google Drive File Migration → Shared Drive — Full Project Documentation

**Project Owner:** Carl Patrick Sajol  
**Status:** ✅ Core migration workflow built — copy function working, item loss bug fixed  
**Started:** April 2026  
**Last Active:** April 2026

---

## What This Is

An n8n automation to migrate all files from the existing Google Drive `READY` folder structure (owned by individual @bumpy.app accounts) to a Shared Drive — solving the ownership problem where designers upload files but Bumpy doesn't own them permanently.

**Why this was needed:** Google Drive files belong to the individual who uploaded them. If a designer's account is deleted or they leave, those files could become inaccessible. The Shared Drive solution means Bumpy owns everything at the organization level.

---

## Folder Structure

```
READY/
└── Batch2025Week47/  (Level 1 — Batch folders)
    └── BLK-US-B9dF4Z-SliderH/  (Level 2 — Concept folders)
        ├── file1.png  (Level 3 — Actual creative files)
        └── file2.mp4
```

---

## Migration Architecture (The n8n Workflow)

```
Manual Trigger
       ↓
Get Batch Folders (Level 1 — inside READY)
       ↓ Split
Create Batch Folder in Shared Drive
       ↓
Combine Batch IDs (Merge)
       ↓
Get Concept Folders (Level 2)
       ↓ Split
Attach Batch ID to Concept (Code Node)
       ↓
Create Concept Folder in Shared Drive
       ↓
Combine Concept IDs (Merge)
       ↓
Get Files with Context (Code Node — fetches files + attaches newConceptId)
       ↓
Copy File to Shared Drive
       ↓
Prepare Log → Google Sheets
```

**Key IDs:**
- READY folder: `11CJ3Dh8u7cE6vMDvsjT38PFAYfihkVHX`
- Shared Drive: `1PwJfB-W6h-vpTpjN1sW-myDC6Jv6TMW5`

---

## Key Technical Decisions

### Copy vs Move
Decision made to **copy files first** (not move) so originals stay safe in case anything goes wrong. Once all copies verified, manually delete originals.  
- Copy endpoint: `POST https://www.googleapis.com/drive/v3/files/{fileId}/copy`
- Body: `{ "parents": ["{{ $json.newConceptId }}"], "name": "{{ $json.fileName }}" }`
- Query param: `supportsAllDrives: true`

### Why Not Ownership Transfer?
Google Drive ownership can only be transferred within the same Google Workspace domain and only for Google-native file types (Docs, Sheets, Slides) — not uploaded `.png` or `.mp4` files. Shared Drive migration is the correct solution.

---

## Bugs Encountered & Fixes

### Bug 1 — All Files Copied to a Single Folder
All files landed in one folder instead of their respective concept folders. The issue: the `newConceptId` from the Merge node wasn't being passed correctly to the Copy File node.

**Root cause:** The Split Files with Context node was using `$input.item.json.files` but after the Merge node, the data structure changed — the `files` array wasn't nested the same way.

**Fix applied:** Changed the "Get Files with Context" Code node to "Run Once for All Items" mode:

```javascript
const results = [];

for (const item of $input.all()) {
  const files = item.json.files || [];
  const newConceptId = item.json.newConceptId;

  if (!files.length) continue;

  for (const file of files) {
    results.push({
      json: {
        fileId: file.id,
        fileName: file.name,
        mimeType: file.mimeType,
        newConceptId
      }
    });
  }
}

return results;
```

This loops through ALL merged items, finds ones with `files` arrays, and flattens them out with `newConceptId` attached.

### Bug 2 — Split Files with Context Only Returning 26 of 100 Items
Node was returning 26 items instead of 100.  
**Root cause:** Same as Bug 1 — `files` array not found at expected path after Merge node.  
**Fix:** Same as above — "Run Once for All Items" mode + explicit loop.

### Bug 3 — Node Names With Apostrophes Breaking Code
`$('Attach Batch ID to Concept')` caused `Unexpected token ')'` syntax error because of the apostrophe in "Batch" context.  
**Fix:** Use double quotes instead of single quotes:
```javascript
// WRONG
$('Attach Batch ID to Concept').item.json.originalConceptId

// CORRECT
$("Attach Batch ID to Concept").item.json.originalConceptId
```

### Bug 4 — `return [{ ... }]` vs `return { ... }` in Code Nodes
Some Code nodes were using `return [{...}]` (array with one object) when they should return `return {...}` (plain object). N8N's behavior differs between these.

### Bug 5 — Rate Limiting on Copy Operations
With 100+ files, hitting Google Drive API rate limits (~10 requests/second for copy operations).  
**Fix applied:** In Copy File node → Settings → **Retry on Fail** enabled: Max tries: 3, Wait: 2000ms. Better than adding Wait nodes.

### Bug 6 — Create Concept Folder Body Error
Body needed to be Raw JSON in n8n. Must be toggled to Expression mode:
```json
{
  "name": "{{ $json.conceptName }}",
  "mimeType": "application/vnd.google-apps.folder",
  "parents": ["{{ $json.newBatchId }}"]
}
```

---

## Workflow Versions

| Version | What Changed |
|---|---|
| v1 | Initial — used Loop nodes (caused context loss) |
| v2 | Merged Get Files + Attach Context into one Code node |
| v3 (FIXED) | Removed Loop nodes, merged Split + Context nodes, correct field names |

**Final workflow file:** `Google_Drive_Migration_FIXED_v3.json`

---

## Current Status

| Component | Status |
|---|---|
| Batch folder creation in Shared Drive | ✅ Working |
| Concept folder creation in Shared Drive | ✅ Working |
| File copy to correct folder | ✅ Working (after v3 fix) |
| Rate limit handling | ✅ Retry on Fail enabled |
| Google Sheets logging | ✅ Working |
| Ownership transfer (alternative approach) | ❌ Not applicable for mp4/png |

---

## After Migration Checklist

1. Verify all files in Shared Drive match originals in READY folder
2. Check file counts per concept folder match
3. Verify file names and types are correct
4. Delete originals from READY folder manually when confirmed
5. Update upload workflow to point to Shared Drive going forward
6. Add all designers as Shared Drive members

---

## Chat Logs

### Chat: Google Drive file ownership transfer automation (April 2026)

**H:** Is it possible in Google Drive for those files to have a file ownership transfer automation?

**A:** Yes — but with key constraints. Ownership transfer only works within the same Google Workspace domain and only works cleanly for Google-native file types (Docs, Sheets, Slides). Uploaded files like `.png` and `.mp4` may not support ownership transfer. Options: Admin Console, Google Apps Script, Drive API v3.

**H:** Like, we have tens of folders inside a folder named "READY" and inside these folders are another folders for each concept (e.g. Batch2025Week47). Inside each of these folders are the files — could be png or mp4. What they want is if a designer uploads a file, transfer ownership automatically.

**A:** Built n8n workflow for this. Architecture: Manual Trigger → Level 1: Get Batch Folders → Split → Level 2: Get Concept Folders → Split → Level 3: Get Actual Files → Split → Check if already correct owner → Transfer Ownership → Log to Google Sheets.

**[After discovering `.png`/`.mp4` ownership transfer limitations]**

**H:** How to transfer all files inside a folder to my Shared Drive using n8n?

**A:** Moving to Shared Drive is actually simpler — use Google Drive API's `update file` endpoint to change the file's parents. Build recommendation: Get Batch → Create Batch in Shared Drive → Get Concepts → Create Concepts in Shared Drive → Get Files with Context → Copy each file.

**H:** Wait... we have folders inside. If I transfer, I need to create folders too using automation.

**A:** Exactly. Migration needs to: 1) Create Batch folder in Shared Drive → 2) Create Concept folder inside it → 3) Copy files.

**H:** I think we shouldn't move the files, but rather copy it first then move it.

**A:** Smart thinking. Copy files first — originals stay safe. Once verified, manually delete originals. Copy endpoint: `POST https://www.googleapis.com/drive/v3/files/{fileId}/copy`. Body: `{ "parents": ["{{ $json.newConceptId }}"], "name": "{{ $json.fileName }}" }`. Query param: `supportsAllDrives: true`.

**Bug — All files copied to a single folder:**

**H:** tf is happening?? All files to copy were in a single folder. I added a loop here because I always hit the limit.

**A:** All files landing in one folder — `newConceptId` from Merge node not passed correctly. Root cause: Split Files with Context used `$input.item.json.files` but after Merge, data structure changed.

**H:** There's no errors in output but see my Split Files with Context — is it really getting all 110 items in the merge?

**A:** That's the bug! Split Files with Context returning 26 out of 100. Code is only getting files from one item instead of all 100.

Fix — change mode to **Run Once for All Items** and update code:
```javascript
const results = [];
for (const item of $input.all()) {
  const files = item.json.files || [];
  const newConceptId = item.json.newConceptId;
  if (!files.length) continue;
  for (const file of files) {
    results.push({
      json: {
        fileId: file.id,
        fileName: file.name,
        mimeType: file.mimeType,
        newConceptId
      }
    });
  }
}
return results;
```

This loops through ALL 100 merged items, finds the ones with `files` arrays, and flattens them with `newConceptId` attached.

**Additional bugs fixed:**
- Node names with apostrophes (e.g. `'Attach Batch ID to Concept'`) break `$()` references — use double quotes: `$("Attach Batch ID to Concept")`
- `return [{...}]` vs `return {...}` — n8n behavior differs, use plain object for single-item returns
- Rate limiting on 100+ copies — enable Retry on Fail in Copy File node: Max tries 3, Wait 2000ms
- Create folder body must be Raw JSON in n8n, toggled to Expression mode
