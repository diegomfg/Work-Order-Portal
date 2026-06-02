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
**Status:** In Progress
**Priority:** High
**Created:** 2026-05-31
**Updated:** 2026-06-01

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

#### Database schema + connection (completed 6/1/2026)

- [x] SQLite schema: `workorders`, `meta`, `uploads` tables with indexes
- [x] `better-sqlite3` connection module with singleton pattern
- [x] Helper functions: upsert, search, stats, upload logging

---

#### Next.js API routes (completed 6/1/2026)

| Route | Method | Purpose | Status |
|---|---|---|---|
| `/api/parse` | POST | Accepts PDF upload, forwards to Python parser, returns `WorkOrder[]` | Done |
| `/api/workorders` | GET | Returns all WOs from DB (with optional status/type filters) | Done |
| `/api/workorders/search` | GET | Customer portal lookup by WO ID, customer ID, or serial | Done |
| `/api/workorders/publish` | POST | Upserts a reviewed batch of `WorkOrder[]` into DB | Done |
| `/api/uploads` | GET | Returns upload history log | Done |
| `/api/meta` | GET | Returns `{ lastUpdated: string \| null }` | Done |

---

#### Python parser microservice (`parser/`)

| File | Purpose |
|---|---|
| `main.py` | FastAPI app — `POST /parse` accepts multipart PDF, returns `WorkOrder[]` |
| `pdf_parser.py` | pdfplumber extraction — splits on "Work Order Information", regex per field |
| `normalizer.py` | Maps mfr codes, derives `type` from labor code, derives `status` from comments, normalizes dates to ISO |
| `requirements.txt` | `fastapi`, `uvicorn`, `pdfplumber`, `python-multipart` |

See **ISSUE-004** for parser implementation details.

---

### ISSUE-004: Build Python PDF Parser Microservice
**Status:** Complete
**Priority:** High
**Created:** 2026-06-01
**Updated:** 2026-06-02

**Description:**
Build the FastAPI microservice that extracts work order data from Ideal DMS PDF exports using pdfplumber. This is a separate HTTP server that the Next.js `/api/parse` route calls.

---

#### Architecture

```
Next.js (/api/parse)  ──POST multipart PDF──>  Python (FastAPI :8000/parse)
                      <──JSON WorkOrder[]────
```

The parser runs as a standalone process on port 8000 (configurable via `PARSER_URL` env var in Next.js).

---

#### Files created (`parser/`)

| File | Purpose |
|---|---|
| `main.py` | FastAPI app with `POST /parse` and `GET /health` endpoints |
| `pdf_parser.py` | pdfplumber extraction logic — splits PDF text on "Work Order Information" |
| `normalizer.py` | Field normalization: mfr codes, status derivation, date formatting |
| `requirements.txt` | Dependencies: `fastapi`, `uvicorn`, `pdfplumber`, `python-multipart` |
| `test_parser.py` | Test script to validate parser against sample PDF |

---

#### Tasks

- [x] Create `parser/` directory structure
- [x] Implement `main.py` — FastAPI app with `/parse` and `/health` endpoints
- [x] Implement `pdf_parser.py` — extract raw fields from PDF blocks using regex
- [x] Implement `normalizer.py` — transform raw fields to WorkOrder schema
- [x] Create `requirements.txt`
- [x] Test against sample PDF (72 work orders extracted successfully)
- [x] Verify field extraction matches expected WorkOrder interface
- [x] Document how to run the parser locally (see below)

---

#### How to run the parser locally

```bash
cd parser
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Test the parser:
```bash
python test_parser.py          # Basic test
python test_parser.py --verbose # Show sample work orders
```

---

#### Test Results (2026-06-02)

Tested against `samples/Work Order History List from March 25 until April 1 (one week).pdf`:

- **72 work orders** parsed successfully
- **14 manufacturers** recognized: Echo, Excalibur, Exmark, Generac, Honda, Husqvarna, Misc, Murray, RedMax, Scag, Shindaiwa, Simpson, Stihl, Wright
- **Status breakdown:** 54 completed, 7 warranty, 5 nwf, 4 review, 2 inprogress
- **Type breakdown:** 32 lawn, 17 2cycle, 23 other
- All required fields extracted (id, customerId, customer, dates, equipment info, comments)

---

#### Field extraction patterns (from Ideal PDF)

Each work order block in the PDF starts with "Work Order Information" and contains:

| Field | Pattern | Notes |
|---|---|---|
| `id` | `WO ID:\s*(\d+)` | Primary key |
| `customerId` | `Customer:\s*(\d+)` | Before customer name |
| `customer` | Line after "Customer: {id}" | Mixed format: "LAST, FIRST" or "COMPANY" |
| `tag` | `Tag #:\s*(.+)` | |
| `tech` | `Tech:\s*(\w+)` | Initials only |
| `inDate` | `In Date:\s*([\d/]+)` | US format, normalize to ISO |
| `startDate` | `Start Date:\s*([\d/]+)` | nullable |
| `complDate` | `Compl\. Date:\s*([\d/]+)` | nullable |
| `outDate` | `Out Date:\s*([\d/]+)` | nullable |
| `mfr` | First 3-4 chars of model field | Map via manufacturer codes |
| `model` | Full model field | |
| `serial` | `Serial/Vin:\s*(.+)` | |
| `meter` | `Meter:\s*(.+)` | nullable for handheld |
| `laborCode` | Labor line item | Used to derive `type`, not stored |
| `comments` | Multi-line block before Amounts | |

---

#### Status derivation logic

Check in order:
1. Comments contain "UNDER WARRANTY" → `warranty`
2. Comments contain "NWF" or "NOTHING WRONG" → `nwf`
3. Comments empty and no flags → `review`
4. Has `inDate` but no `complDate` → `inprogress`
5. Otherwise → `completed`

---

#### Equipment type derivation

| Labor code contains | Type |
|---|---|
| `LBR LABOR LAWN EQUIPMENT` | `lawn` |
| `LBRTCLABOR POWER EQUIPMENT 2 CYCLE` | `2cycle` |
| Anything else | `other` |

---

#### Manufacturer code map

```
STI  → Stihl      SCA  → Scag       WRI  → Wright
ECH  → Echo       RED  → RedMax     EXM  → Exmark
HUS  → Husqvarna  HON  → Honda      GEN  → Generac
SHI  → Shindaiwa  MUR  → Murray     SIMP → Simpson
MISC → Misc       EXC  → Excalibur
```

---

## Closed Issues

(none yet)
