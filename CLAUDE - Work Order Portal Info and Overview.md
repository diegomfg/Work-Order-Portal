# Ideal DMS Service Portal — Project Knowledge File

## What This Is

A **customer-facing work order status portal** that integrates with **Ideal DMS**, the dealer management software used by outdoor power equipment (OPE) dealerships across the US. Customers check repair status from their phone instead of calling the shop.

This is being developed as a **portfolio/demo project** by Diego (All Dade Lawnmowers, Miami). The intent is a working, open-source demo on GitHub that demonstrates the concept to other OPE dealers — not a custom one-off build.

---

## Product Vision

### The problem
OPE dealers using Ideal DMS have no way to give customers self-service repair status. Customers call the shop repeatedly asking "is my mower ready?" — tying up service writers (like Mariel) who have to look up WOs manually while managing walk-ins.

### The solution
Parse Ideal's export files (PDF and CSV), upsert into a database, and surface a clean customer-facing status page. No calling, no waiting on hold.

### Target users
- **Primary:** OPE dealers running Ideal DMS — the parser works for all of them because Ideal's export format is consistent across installations (to be confirmed across versions)
- **Secondary:** The customers of those dealers — the people actually using the portal day-to-day
- **Not:** A generic work order tool. This is an Ideal integration, and that specificity is the point.

### Distribution (current)
GitHub demo only. Distribution/SaaS packaging is a future problem. For now: clone, configure, run.

---

## Data Source: Ideal DMS Exports

Ideal can export **Work Order History List** reports as **PDF**. This is the only format used — CSV export is only available for Pending reports, which All Dade does not use. All parsing goes through the PDF parser (Python microservice).

### Critical behaviors of Ideal exports

1. **Exports by completion date, not in-date.** A WO that arrived 3 months ago but closed today will appear in today's export. Confirmed from real data.
2. **Open WOs do not appear** in history exports until they are completed. This means in-progress jobs are invisible until closure.
3. **Initial load should cover 90+ days** to capture all recently-closed WOs that may have been open for a long time.
4. **Ongoing imports should overlap** (e.g. always pull the last 14 days) to catch WOs that closed after a prior export window.
5. **Upsert by WO ID is mandatory.** Never insert duplicates — if a WO ID already exists, update it.

### Talking to Ideal about an API
Diego is planning to contact Ideal to discuss:
- Whether a REST API exists or is on their roadmap
- Whether scheduled/automated exports (FTP drop, email attachment, webhook) are possible
- Whether the CSV/PDF format is stable across Ideal versions

Possible outcomes in order of preference:
1. They have an API → integrate directly, no parsing needed
2. They add scheduled auto-export → backend polls a location automatically
3. No automation, but format confirmed stable → manual upload flow works fine as v1

---

## Fields Extracted Per Work Order

Fields marked **[store]** are persisted to the database. Fields marked **[ignore]** are present in the Ideal export but deliberately discarded.

| Field | Source in Ideal export | Action | Notes |
|---|---|---|---|
| `id` | "WO ID:" | **store** | **Primary key** — used for all upsert logic |
| `customerId` | "Customer:" number | **store** | Internal Ideal customer ID — useful for future auth |
| `customer` | Customer name line | **store** | Mixed format: "LAST, FIRST" or "COMPANY NAME" |
| `tag` | "Tag #:" | **store** | Shop's internal equipment tag number |
| `tech` | "Tech:" | **store (internal only)** | Technician initials — stored in DB but never shown to customers |
| `inDate` | "In Date:" | **store** | Date equipment arrived — primary date for UI grouping |
| `startDate` | "Start Date:" | **store** | Date work actually began |
| `complDate` | "Compl. Date:" | **store** | Date work was completed |
| `outDate` | "Out Date:" | **store** | Date equipment left the shop |
| `mfr` | Prefix of Model field | **store** | See manufacturer code map below |
| `model` | Model field (after mfr prefix) | **store** | Full model code |
| `desc` | Description field | **store** | Human-readable equipment description |
| `serial` | "Serial/Vin:" | **store** | Serial number; sometimes a customer-name placeholder |
| `meter` | "Meter:" | **store** | Hour meter reading (large equipment only); null for handheld |
| `laborCode` | Labor line code | **derive then discard** | Used only to derive `type`; not stored |
| `type` | Derived from `laborCode` | **store** | `lawn`, `2cycle`, or `other` |
| `status` | Derived from comments | **store** | See status derivation below |
| `comments` | Comments block | **store** | Technician notes — shown to customer |
| Pickup / Deliver | "Pickup: No / Deliver: No" | **ignore** | Ideal built-in fields, always default values, not meaningful |
| All pricing | Labor / Parts / Tax / Total / Extras | **ignore** | Never stored, never displayed — customers must not see costs |

### Equipment type derivation

| `type` value | Ideal labor code |
|---|---|
| `lawn` | `LBR LABOR LAWN EQUIPMENT` |
| `2cycle` | `LBRTCLABOR POWER EQUIPMENT 2 CYCLE / SMALL 4` |
| `other` | Anything else (generators, pressure washers, trailers, blade sharpening) |

### Status derivation

Ideal has no explicit customer-facing status field. Derive it as follows (check in order):

| Status | Condition |
|---|---|
| `warranty` | Comments contain "UNDER WARRANTY" |
| `nwf` | Comments contain "NWF" or "NOTHING WRONG" |
| `review` | Comments are completely empty AND no warranty/NWF language — something is unrecorded, flag it |
| `inprogress` | Has `inDate`, no `complDate` — unit is still in the shop (future use with live data) |
| `completed` | Has `complDate`, not otherwise flagged |

**Important:** Do NOT use `$0` total as a signal for any status. Many legitimate WOs show $0 because the customer has account terms (net 30, end of month, 7-day, etc.) — the charge is invoiced separately. Zero-dollar totals are meaningless for status derivation.

### Manufacturer code map

```
STI       → Stihl
SCA       → Scag
WRI       → Wright
ECH       → Echo
RED       → RedMax
EXM       → Exmark
EXC       → Excalibur (legacy brand, rarely serviced — treat as `other` type)
HUS       → Husqvarna
HON       → Honda
GEN       → Generac
SHI       → Shindaiwa
MUR       → Murray
SIMP      → Simpson
MISC      → Misc / Unknown
```

---

## Architecture

### Chosen stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | **Next.js (React)** | Dynamic filters, search, per-dealer routing — SSR where useful |
| Backend API | **Node.js + Express (or Fastify)** | Same language as frontend, fast to build, good file upload handling |
| PDF Parser | **Python microservice** (FastAPI + pdfplumber) | pdfplumber handles complex PDF layouts far better than JS alternatives |
| Database | **SQLite** (dev) → **PostgreSQL** (prod) | SQLite is zero-config for demo; Postgres for when this goes live |
| File uploads | **Multer** (Node middleware) | Standard multipart handler for PDF uploads |

### System diagram

```
┌─────────────────────────────────────────────┐
│              Next.js Frontend               │
│                                             │
│  /status        Customer-facing portal      │
│  /admin         Dealer upload + dashboard   │
└──────────────────────┬──────────────────────┘
                       │ REST API calls
┌──────────────────────▼──────────────────────┐
│           Node.js / Express API             │
│                                             │
│  POST /api/import     File upload + parse   │
│  GET  /api/workorders Filtered WO query     │
│  GET  /api/status/:id Single WO lookup      │
└──────┬───────────────────────────┬──────────┘
       │                           │
┌──────▼──────┐           ┌────────▼────────┐
│   SQLite /  │           │ Python Parser   │
│  PostgreSQL │           │  Microservice   │
│             │           │                 │
│  workorders │           │  FastAPI        │
│  dealers    │           │  pdfplumber     │
│  customers  │           │  POST /parse    │
└─────────────┘           └─────────────────┘
```

### Parser design rule

The PDF parser must return the normalized WO object shape defined below. All downstream logic (upsert, API responses) depends only on this shape.

```typescript
// Shared WO type — both parsers must produce this
// Note: tech is stored in DB for internal use but never sent to the customer-facing API
interface WorkOrder {
  id: string;           // WO ID — primary key
  customerId: string;
  customer: string;
  tag: string;
  tech: string;         // stored internally; excluded from customer-facing responses
  inDate: string;       // ISO date string: "2026-03-31"
  startDate: string | null;
  complDate: string | null;
  outDate: string | null;
  mfr: string;          // Normalized display name (not Ideal code)
  model: string;
  desc: string;
  serial: string;
  meter: string | null;
  type: 'lawn' | '2cycle' | 'other';
  status: 'completed' | 'warranty' | 'nwf' | 'review' | 'inprogress';
  comments: string;
  // Pricing fields (labor, parts, tax, total) are NEVER extracted or stored
}
```

### PDF parser (Python microservice)

```
service/parser/
├── main.py           FastAPI app — POST /parse accepts multipart PDF
├── pdf_parser.py     pdfplumber extraction logic
├── normalizer.py     Converts raw extracted fields → WorkOrder shape
├── requirements.txt  fastapi, uvicorn, pdfplumber, python-multipart
└── samples/          Anonymized real Ideal PDF exports for testing
```

**Parsing strategy for Ideal PDFs:**
- Each WO block starts with the text "Work Order Information"
- Key fields appear as "Label: Value" patterns on predictable lines
- Comments block is multi-line free text between the labor table and the Amounts section
- Labor code (for type derivation) appears in the labor line rows

```python
# Rough extraction flow
import pdfplumber, re

def parse_ideal_pdf(pdf_bytes: bytes) -> list[dict]:
    workorders = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        full_text = "\n".join(page.extract_text() for page in pdf.pages)
    blocks = re.split(r'Work Order Information', full_text)[1:]
    for block in blocks:
        wo = extract_fields(block)   # regex patterns per field
        wo = normalize(wo)           # map mfr codes, derive status/type
        workorders.append(wo)
    return workorders
```

### API parser client (Node.js)

```
api/parsers/
├── pdfClient.js      HTTP client that POSTs PDF to Python service, returns WorkOrder[]
└── normalizer.js     Shared field normalization (mfr codes, status logic, date formatting)
```

The Node API calls `pdfClient.js` for PDF uploads, then passes the returned WorkOrder array to the upsert logic.

### Upsert logic

```javascript
// api/services/workorderService.js
async function upsertWorkOrders(db, workorders) {
  const stmt = db.prepare(`
    INSERT INTO workorders (id, customer_id, customer, tech, in_date, compl_date,
      mfr, model, description, serial, type, status, comments, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      status      = excluded.status,
      compl_date  = excluded.compl_date,
      out_date    = excluded.out_date,
      comments    = excluded.comments,
      updated_at  = CURRENT_TIMESTAMP
  `);
  const results = { inserted: 0, updated: 0 };
  for (const wo of workorders) {
    const info = stmt.run(...Object.values(wo));
    info.changes === 1 ? results.inserted++ : results.updated++;
  }
  return results;
}
```

---

## Project Folder Structure

```
ideal-service-portal/
│
├── CLAUDE.md                          ← this file
│
├── frontend/                          ← Next.js app
│   ├── app/
│   │   ├── status/page.tsx            ← Customer-facing portal
│   │   └── admin/page.tsx             ← Dealer upload + management UI
│   ├── components/
│   │   ├── WorkOrderCard.tsx
│   │   ├── FilterBar.tsx
│   │   └── StatPills.tsx
│   └── lib/
│       └── api.ts                     ← API client helpers
│
├── api/                               ← Node.js / Express backend
│   ├── index.js                       ← Express app + route registration
│   ├── routes/
│   │   ├── import.js                  ← POST /api/import (file upload)
│   │   └── workorders.js              ← GET /api/workorders, /api/status/:id
│   ├── parsers/
│   │   ├── pdfClient.js               ← Calls Python microservice
│   │   └── normalizer.js              ← Shared normalization logic
│   ├── services/
│   │   └── workorderService.js        ← DB upsert + query logic
│   └── db/
│       ├── schema.sql
│       └── database.js                ← SQLite connection (better-sqlite3)
│
├── parser/                            ← Python PDF microservice
│   ├── main.py                        ← FastAPI app
│   ├── pdf_parser.py
│   ├── normalizer.py
│   └── requirements.txt
│
├── samples/                           ← Anonymized Ideal export files
│   └── sample-week.pdf                ← Real export, customer names changed
│
├── prototype/                         ← Original standalone HTML demos
│   ├── work-order-portal-week.html    ← 72 WOs, fully working, reference UI
│   └── work-order-portal.html         ← Earlier 10-WO prototype
│
└── docker-compose.yml                 ← Spins up API + parser service together
```

---

## UI Design System

Carries over from the working HTML prototype. All visual decisions are already validated.

### Fonts
- **Display / headings:** Bebas Neue (Google Fonts)
- **Body / UI:** DM Sans (Google Fonts)

### Color palette

```css
--orange: #FF8800;              /* Primary brand accent */
--dark:   #1a1a1a;              /* Page background */
--mid:    #2e2e2e;              /* Header / nav background */
--surface:#242424;              /* Inset surfaces, hero strip */
--card:   #2a2a2a;              /* Work order cards */
--border: rgba(255,255,255,0.08);

--text:   #f0f0f0;
--muted:  #888;
--subtle: #555;

--green:  #4CAF7D;              /* Completed */
--purple: #9B7FD4;              /* Under warranty */
--amber:  #E6A817;              /* NWF */
--red:    #E05252;              /* Needs review */
--blue:   #4A9FD4;              /* In progress */
```

### Work order card — collapsed
Status dot · WO # · customer name · mfr + description · equipment type tag · date badge (calendar style, shows month/day) · status badge · chevron

### Work order card — expanded (click to toggle)
Equipment (mfr + model) · description · serial/VIN · tag # · date in · date completed · warranty or NWF callout block (if applicable) · technician notes (orange left-border accent)

**Never shown to customers:** technician name/code, labor cost, parts cost, tax, order total, any pricing, pickup/delivery fields.

### Filters (all combinable, live update)

| Filter | Behavior |
|---|---|
| Search input | Matches customer name, WO #, serial  | Not many filters should be allowed as it introduces the possibility of customers seeing other people's information.
| Customer dropdown | Populated from data, sorted A–Z |
| Status dropdown | Fixed: completed / warranty / nwf / review / inprogress |
| Equipment type | Fixed: lawn / 2-cycle / other |
| Date (in-date) | Populated from data, sorted most recent first |

---

## Known Edge Cases & Parser Notes

- **$0 totals are not meaningful** — many customers have account terms (net 30, end of month, 7-day, etc.) and their WOs show $0 in the export. Never use total amount to infer status.
- **Pickup/Delivery fields** ("Pickup: No / Deliver: No") are Ideal built-ins that always default to these values for this shop. Skip them entirely during parsing.
- **Tech field** is parsed and stored but never surfaced to customers. It may be useful for internal admin views later.
- Some WOs have no serial number — Ideal lets dealers enter customer names as placeholders (e.g. "MESA", "ISMAEL"). Display as-is.
- Tag `595` / `596` are generic walk-in counter tags at All Dade, not unique equipment identifiers — don't treat them as such (other dealers may use different conventions).
- WO description sometimes includes condition flags: `B/O` (back order), `DAMAGE` — preserve in `desc`, don't strip.
- `complDate` and `outDate` are often the same; sometimes the gap is meaningful (unit was done but not picked up). `inDate` is the most useful date for customer display.
- Meter field is only populated for large equipment (ZTRs, standers). Null for handheld units — handle gracefully.
- **EXC (Excalibur)** is a legacy brand rarely serviced. Map it separately from EXM (Exmark) and treat as `other` equipment type.

---

## Technician Code Reference

| Code | Display |
|---|---|
| RM | Tech RM |
| JA | Tech JA |
| JAL | Tech JAL |
| NT | Tech NT |
| IL | Tech IL |
| OD | Tech OD |
| RR | Tech RR |
| FO | Tech FO |

Full names TBD — confirm with service manager (Nick) before any customer-facing display.

---

## UI Scale & Design Notes

The prototype HTML was designed and validated at **125% browser zoom** — this is the sweet spot where the card layout, typography, and spacing feel right. When building the React version, size elements as if 100% zoom is the baseline but ensure the layout holds at 125% as the primary target. Practically this means:
- Font sizes can lean slightly larger than typical defaults
- Card padding and gap values should be generous
- Test all breakpoints at 125% zoom, not just 100%

---

## Docker: How It Works for This Repo

The repo contains **only text config files** — no binary image is committed to Git.

- `Dockerfile` (one per service) — build instructions; reads like a recipe
- `docker-compose.yml` — orchestrates all three services (frontend, API, parser) together

When someone clones the repo and runs `docker compose up --build`, Docker:
1. Reads the Dockerfiles
2. Pulls base images (Node, Python) from Docker Hub
3. Installs dependencies inside containers
4. Starts all three services wired together

**Requirements for the person cloning:** Docker Desktop installed (one-time install, free). Nothing else — no Node version conflicts, no Python environment setup, no "works on my machine."

**Optional enhancement:** Push a pre-built image to GitHub Container Registry (`ghcr.io`) so people can run `docker compose pull && docker compose up` and skip the build step entirely. Not required for the portfolio demo.

The goal for the README:
```bash
git clone https://github.com/your-handle/ideal-service-portal
cd ideal-service-portal
docker compose up --build
# → open localhost:3000
```

---

## GitHub / Portfolio Notes

- Include `/samples` folder with an **anonymized** real Ideal PDF export so anyone cloning the repo can run the parser immediately without needing an Ideal account
- `docker-compose.yml` should spin up the full stack (API + Python parser + frontend) in one command — this is important for the README demo
- README should lead with the problem statement: *"OPE dealers using Ideal DMS spend significant time fielding status-check calls — this eliminates that"*
- A short screen recording (filter by customer → click WO → see status) in the README will do more than any amount of documentation
