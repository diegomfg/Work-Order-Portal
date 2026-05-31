# Issue Tracking

## Open Issues

### ISSUE-001: Verify Work Order Structure Against Source Files
**Status:** In Progress
**Priority:** High
**Created:** 2026-05-29
**Updated:** 2026-05-29

**Description:**
The WorkOrder interface is defined in the project knowledge file, but we need to cross-verify that the field definitions match actual Ideal PDF exports.

**Note:** CSV export is not available for Work Order History reports — only for Pending reports, which All Dade does not use. CSV parser has been scrapped.

**Tasks:**
- [x] Analyze HTML demo data structure (73 work orders)
- [x] Confirm `customerId` field — it is the `Customer: {number}` value that appears before the customer name in each WO block in the Ideal PDF
- [ ] Document any discrepancies or edge cases between PDF fields and WorkOrder interface
- [ ] Update WorkOrder interface if needed

**Findings from HTML Demo Analysis:**

The HTML demo (`work-order-portal-week.html`) contains 73 work orders parsed from the one-week PDF export.

### Fields Present in HTML Demo
```
id, customer, tag, tech, inDate, complDate, mfr, model, desc, serial, type, status, comments
```

### Fields Missing from HTML Demo (defined in MD but not extracted)
| Field | Notes |
|-------|-------|
| `customerId` | Internal Ideal customer ID — needs to be extracted from PDF |
| `startDate` | Date work began — needs to be extracted from PDF |
| `outDate` | Date equipment left shop — needs to be extracted from PDF |
| `meter` | Hour meter reading — needs to be extracted from PDF |

### Date Format Discrepancy
- **MD file specifies:** ISO format `"2026-03-31"`
- **HTML demo uses:** US format `"3/31/2026"`
- **Action:** Normalize to ISO in database, format for display in UI

### Tech Field Visibility
- HTML demo displays tech initials to users
- MD file says tech should be stored but **never shown to customers**
- **Action:** Hide from customer-facing UI in production

### Manufacturers Found in Data
Stihl, Scag, Wright, Echo, RedMax, Exmark, Husqvarna, Honda, Generac, Shindaiwa, Murray, Simpson, Misc, B&E

### Equipment Types Distribution
- `lawn`: Zero-turn mowers, riders, walk-behinds
- `2cycle`: Trimmers, blowers, chainsaws, hedge trimmers, edgers
- `other`: Generators, pressure washers, sprayers, trailers, blade sharpening

### Status Distribution in Demo Data
- `completed`: 62 orders
- `warranty`: 6 orders
- `nwf`: 5 orders
- `review`: 3 orders (empty comments)
- `inprogress`: 0 orders (all exports are completed WOs)

**Next Steps:**
- Confirm `startDate`, `outDate`, and `meter` are present in the actual PDF source (`customerId` confirmed ✓)
- Update WorkOrder interface if any discrepancies are found

---

### ISSUE-002: Clarify "NWF" Status Meaning
**Status:** Blocked (waiting on service department)
**Priority:** High (upgraded — confirmed ambiguity in real data)
**Created:** 2026-05-29
**Updated:** 2026-05-29

**Description:**
"NWF" in technician comments is ambiguous:
- **Nothing Wrong Found** — equipment tested, issue not reproduced
- **Not Worth Fixing** — repair cost exceeds equipment value

These have different customer-facing implications and may need different UI treatment.

**Evidence from HTML Demo Data:**

Both meanings appear in actual work order comments:

**"Nothing Wrong Found" usage (WO #1398925):**
> `"Nothing wrong found. Unit inspected and returned to customer."`

**"Not Worth Fixing" usage (WO #1399688):**
> `"Piston/cylinder scored and needs muffler. Unit deemed not worth fixing (NWF)."`

This confirms the same status code is used for **two very different outcomes**.

**Tasks:**
- [ ] Confirm with Nick (service manager) what NWF means at All Dade
- [ ] Determine if both meanings are used (different abbreviations?)
- [ ] Update status derivation logic accordingly
- [ ] Define customer-facing copy for each status

**Possible Solutions:**
1. **Split into two statuses:** `nwf-nothing-wrong` and `nwf-not-worth` with different UI colors/copy
2. **Use comment text analysis:** Look for keywords like "not worth" vs "nothing wrong"
3. **Single status with neutral copy:** "No repair performed" — avoids implying either meaning
4. **Ask service dept to use different codes:** e.g., "NWF" vs "NWR" (Not Worth Repair)

---

### ISSUE-003: Build Admin Dashboard + Upload Flow
**Status:** Open
**Priority:** High
**Created:** 2026-05-31
**Updated:** 2026-05-31

**Description:**
Build the dealer-facing admin section: a dashboard with upload history and a multi-step PDF upload flow that parses, lets admins review/edit, and publishes work orders to the database.

---

#### Architecture decisions (confirmed)

**Backend: Next.js API routes (not a separate Express server)**
API routes live inside `frontend/app/api/`. Keeps the dev setup to two processes (Next.js + Python parser) instead of three. Can be extracted to standalone Express later if needed — no meaningful tradeoff at this stage.

**Database: SQLite (dev) → PostgreSQL (prod)**
SQLite via `better-sqlite3` — zero config for local dev and anyone cloning the repo. Schema and upsert logic already designed in project docs. Swap connection string for Postgres when deploying.

**PDF Parser: Python microservice (FastAPI + pdfplumber) — build now**
Must remain a separate process regardless of backend choice — JS PDF parsing can't reliably handle Ideal's layout. We have the sample PDF to test against, so build the real parser this session rather than simulating it.

**"Last Updated" timestamp**
Written to the database (or a simple meta table) when a publish completes. Dashboard reads it via API. Represents the most recent successful upload, not the current time. Intended to be updated daily once the manual upload workflow is established.

---

#### Admin dashboard (`/admin`)

**Tasks:**
- [ ] Stats strip: total WO count + breakdown by status (completed / warranty / nwf / review / inprogress)
- [ ] "Last updated" timestamp — reads from DB meta table, shows date + time
- [ ] "Upload New Report" button → `/admin/upload`
- [ ] Recent uploads log (stretch goal — list of past upload sessions with WO counts)

---

#### Upload flow (`/admin/upload`) — 4 steps, single page

**Step 1 — Drop zone**
- [ ] Drag & drop target for PDF files
- [ ] "Browse files" fallback button
- [ ] PDF-only validation (reject other file types with inline error)

**Step 2 — Parsing**
- [ ] Loading state while PDF is POSTed to Python parser microservice
- [ ] Error state if parser returns a failure

**Step 3 — Review**
- [ ] Table of all parsed work orders (WO #, customer, equipment, status, date in)
- [ ] Per-row status override (dropdown — admin can correct misclassified statuses before publish)
- [ ] Per-row exclude toggle (checkbox — admin can drop individual WOs from the publish batch)
- [ ] Summary bar: "X work orders — Y new, Z updates" (requires DB lookup to determine new vs update)
- [ ] Field editing scoped to status only for now; full field editing deferred

**Step 4 — Publish / Done**
- [ ] "Publish N work orders" confirmation button
- [ ] POST reviewed + filtered WOs to upsert API route
- [ ] Write `last_updated` timestamp to DB meta table on success
- [ ] Success state → redirect to `/admin` dashboard

---

#### Next.js API routes to build

| Route | Method | Purpose |
|---|---|---|
| `/api/parse` | POST | Accepts PDF upload, forwards to Python parser, returns `WorkOrder[]` |
| `/api/workorders` | GET | Returns all WOs from DB (with optional status/type filters) |
| `/api/workorders/publish` | POST | Upserts a reviewed batch of `WorkOrder[]` into DB |
| `/api/meta` | GET | Returns `{ lastUpdated: string \| null }` |

---

#### Python parser microservice (`parser/`)

| File | Purpose |
|---|---|
| `main.py` | FastAPI app — `POST /parse` accepts multipart PDF, returns `WorkOrder[]` |
| `pdf_parser.py` | pdfplumber extraction — splits on "Work Order Information", regex per field |
| `normalizer.py` | Maps mfr codes, derives `type` from labor code, derives `status` from comments, normalizes dates to ISO |
| `requirements.txt` | `fastapi`, `uvicorn`, `pdfplumber`, `python-multipart` |

---

## Closed Issues

(none yet)
