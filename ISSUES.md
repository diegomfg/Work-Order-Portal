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
- Confirm all 4 missing fields (`customerId`, `startDate`, `outDate`, `meter`) are present in the actual PDF source
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

## Closed Issues

(none yet)
