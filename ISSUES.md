# Issue Tracking

## Open Issues

---

### ISSUE-003: Build Admin Dashboard + Upload Flow
**Status:** In Progress
**Priority:** High
**Created:** 2026-05-31
**Updated:** 2026-06-05 (API wiring complete; minor polish items remain)

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

#### Admin dashboard (`/admin`) — wired (6/5/2026)

**Tasks:**
- [x] Stats strip: total WO count + breakdown by status (completed / warranty / nwf / review / inprogress)
- [x] "Last updated" timestamp
- [x] "Upload New Report" button → `/admin/upload`
- [x] Stats strip wired to `/api/workorders?stats=true`
- [x] "Last updated" wired to `/api/meta`
- [ ] Recent uploads log — wired to `/api/uploads`

---

#### Upload flow (`/admin/upload`) — wired (6/5/2026)

**Step 1 — Drop zone**
- [x] Drag & drop target for PDF files
- [x] "Browse files" fallback button
- [x] PDF-only validation — inline error on wrong file type (client-side MIME check done; parser rejects non-Ideal PDFs via title check)

**Step 2 — Parsing**
- [x] Loading state (spinner)
- [x] Wire to `POST /api/parse` with PDF file
- [x] Error state if parser returns a failure

**Step 3 — Review**
- [x] Table of all parsed work orders (WO #, customer, equipment, status, date in)
- [x] Per-row status override (dropdown)
- [x] Per-row exclude toggle (checkbox)
- [x] Summary bar with active count and excluded count
- [ ] "Y new, Z updates" breakdown (requires DB lookup — deferred)

**Step 4 — Publish / Done**
- [x] Publish confirmation screen with WO count
- [x] Success state
- [x] Wire publish button to `POST /api/workorders/publish`
- [x] Write `last_updated` on success → redirect to `/admin`

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
source .venv/bin/activate   # activate
pip install -r requirements.txt  # only needed if packages changed
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

---

### ISSUE-005: End-to-End Testing
**Status:** In Progress
**Priority:** High
**Created:** 2026-06-05
**Updated:** 2026-06-08

**Description:**
Validate the full admin upload flow end-to-end against a real PDF before building the customer portal. Catches field mapping bugs, edge cases in the parser, and API contract issues before they compound.

**Scope:**
- Upload a real Ideal DMS PDF through the browser UI
- Confirm all 72 (or expected count) work orders parse and display correctly in the review step
- Verify status overrides and excludes carry through to publish
- Confirm DB is populated correctly after publish (query SQLite directly)
- Confirm stats strip and "last updated" reflect the new data on `/admin`
- Test error paths: wrong file type, parser down, empty PDF

**Tasks:**
- [x] Upload sample PDF end-to-end through `/admin/upload`
- [x] Verify upsert logic — re-upload confirmed 17 WOs updated correctly
- [x] Verify camelCase field mapping is correct across parser → API → UI
- [x] Fix date rendering bug — search route was returning snake_case DB rows; added `toCamelFormat` mapping (2026-06-08)
- [ ] Spot-check parsed WOs against source PDF (spot-check 5–10 records)
- [ ] Test status override persists to DB
- [ ] Test exclude toggle: excluded WOs not written to DB
- [ ] Test publish → redirect → dashboard stats update
- [ ] Test error: drop a non-PDF file
- [ ] Test error: upload while parser is not running

---

### ISSUE-006: Customer-Facing Portal
**Status:** In Progress
**Priority:** High
**Created:** 2026-06-05
**Updated:** 2026-06-08

**Description:**
Build the public-facing portal where customers can look up their work order status by WO number, customer ID, or serial number. Wired directly to the live SQLite (dev) / PostgreSQL (prod) database via the existing `/api/workorders/search` route.

**Tasks:**
- [x] Build search page (`/status`) with single input and submit
- [x] Wire to `GET /api/workorders/search`
- [x] Build result card component (fields per ISSUE-001 spec)
- [x] Build "not found" empty state
- [x] Build loading and error states
- [x] Tested against live DB — search by WO#, serial, customer ID all working (2026-06-08)
- [ ] Resolve ISSUE-002 (NWF copy) — update customer-facing status label once confirmed
- [ ] Mobile layout QA

---

---

### ISSUE-007: Admin Work Order Browser + In-Place Editor
**Status:** Planned
**Priority:** High
**Created:** 2026-06-08
**Updated:** 2026-06-08

**Description:**
Admins need a way to browse and manually edit work orders already in the database — outside of the upload flow. This covers corrections after the fact (wrong status, bad comments, etc.) without requiring a re-upload.

**UX flow:**
1. `/admin/workorders` — paginated table of all WOs in the DB, sorted by `inDate` descending
2. Clicking a row navigates to `/admin/workorders/[id]`
3. Edit page shows all fields (including admin-only: tech, tag, startDate, outDate) as editable inputs
4. Save button writes changes back to the DB

---

#### Table page (`/admin/workorders`)

**Columns:** WO#, Customer, Manufacturer, Model, Status, Date In, Date Completed
**Behaviour:**
- Paginated — 25 rows per page, prev/next controls
- Status shown as colored badge (reuse admin dashboard style)
- Each row is clickable → `/admin/workorders/[id]`
- Filter bar (optional, deferred): filter by status or date range

**Tasks:**
- [ ] Add `GET /api/workorders` route support for pagination (`?page=&limit=`)
- [ ] Build `/admin/workorders` page — table + pagination controls
- [ ] Wire to `GET /api/workorders?page=&limit=25`
- [ ] Clickable rows → navigate to edit page

---

#### Edit page (`/admin/workorders/[id]`)

**Fields editable by admin:**
| Field | Input type |
|---|---|
| `status` | Dropdown (completed / warranty / nwf / review / inprogress) |
| `comments` | Textarea |
| `tech` | Text input |
| `tag` | Text input |
| `complDate` | Date input |
| `outDate` | Date input |

**Read-only on this page:** WO#, customer, customerId, mfr, model, serial, inDate, type

**Tasks:**
- [ ] Add `GET /api/workorders/[id]` route — returns single WO (all fields including admin-only)
- [ ] Add `PATCH /api/workorders/[id]` route — accepts partial update, writes to DB
- [ ] Add `updateWorkOrder` helper to `lib/db/index.ts`
- [ ] Build `/admin/workorders/[id]` edit page
- [ ] Save button calls `PATCH`, shows success/error feedback
- [ ] Back link → `/admin/workorders` (preserve page position if possible)

---

## Closed Issues

### ISSUE-002: Clarify "NWF" Status Meaning
**Status:** Closed
**Priority:** High
**Created:** 2026-05-29
**Closed:** 2026-06-10

**Resolution:**
No official work order code or labor item exists for either NWF meaning ("Nothing Wrong Found" or "Not Worth Fixing"), and no standard can be enforced in the service department. Splitting statuses or keyword detection would be false precision.

**Decision:** Treat `nwf` as a single opaque status. The customer portal shows the technician notes (which often contain enough context) alongside a neutral prompt to contact the shop. The service advisor fields the call and explains the outcome directly.

**Customer-facing copy:**
- Badge label: `Contact Shop`
- Callout: *"Please contact the shop directly — a service advisor can explain the outcome of this work order."*

---

### ISSUE-001: Verify Work Order Structure Against Source Files
**Status:** Closed
**Priority:** High
**Created:** 2026-05-29
**Closed:** 2026-06-04

**Resolution:**
Work order structure finalized and verified against actual Ideal DMS PDF exports. The Python parser (ISSUE-004) successfully extracts all required fields.

#### Final Field Specification

**Customer Portal displays:**
| Field | Description |
|-------|-------------|
| `id` | Work Order ID (primary identifier) |
| `customerId` | Ideal's internal customer number |
| `customer` | Customer name |
| `inDate` | Date equipment came in (ISO format) |
| `complDate` | Completion date (if present) |
| `mfr` | Manufacturer (normalized from code) |
| `model` | Model code |
| `desc` | Equipment description |
| `serial` | Serial number |
| `type` | Equipment type (`lawn`, `2cycle`, `other`) |
| `status` | Work order status |
| `comments` | Tech comments (includes labor performed) |

**Admin-only fields (stored but hidden from customers):**
| Field | Description |
|-------|-------------|
| `tech` | Technician initials |
| `tag` | Shop equipment tag |
| `startDate` | Date work began |
| `outDate` | Date equipment left shop |

**Fields explicitly removed:**
| Field | Reason |
|-------|--------|
| `meter` | Not useful to display to customers |
| `failureDate` | Not used; `inDate` is the relevant date |

#### Export Workflow
- Reports exported by **In Date range** (e.g., 1 day, 1 week)
- Recommended: 1 week max per upload to keep review manageable (~72 WOs/week typical)

#### PDF Structure
- **Left half:** Customer info, WO ID, equipment details, dates
- **Right half:** Labor/sales data — only extract comments, never show pricing

#### Key Decisions
- Dates normalized to ISO format (`YYYY-MM-DD`) in database, formatted for display in UI
- Tech initials stored for admin use but never shown to customers
- Comments field captures labor performed (no separate labor field needed)
