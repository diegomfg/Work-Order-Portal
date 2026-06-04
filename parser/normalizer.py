"""
Field normalization for Work Order data extracted from Ideal DMS PDFs.
- Manufacturer code mapping
- Equipment type derivation from labor codes
- Status derivation from comments
- Date format conversion (US -> ISO)
"""

import re
from datetime import datetime
from typing import Optional

# Manufacturer code -> display name mapping
MANUFACTURER_MAP = {
    "STI": "Stihl",
    "SCA": "Scag",
    "WRI": "Wright",
    "ECH": "Echo",
    "RED": "RedMax",
    "EXM": "Exmark",
    "EXC": "Excalibur",
    "HUS": "Husqvarna",
    "HON": "Honda",
    "GEN": "Generac",
    "SHI": "Shindaiwa",
    "MUR": "Murray",
    "SIMP": "Simpson",
    "MISC": "Misc",
    "B&E": "B&E",
}


def normalize_manufacturer(model_field: str) -> tuple[str, str]:
    """
    Extract manufacturer from model field prefix.
    Returns (manufacturer_name, model_code).
    """
    if not model_field:
        return ("—", "—")

    model_upper = model_field.upper().strip()

    # Check for known prefixes (longest first to catch SIMP before SI)
    for code in sorted(MANUFACTURER_MAP.keys(), key=len, reverse=True):
        if model_upper.startswith(code):
            mfr = MANUFACTURER_MAP[code]
            # Remove prefix and clean up model
            model = model_field[len(code):].strip()
            # Remove leading spaces, dashes, or underscores
            model = re.sub(r'^[\s\-_]+', '', model)
            return (mfr, model if model else model_field)

    # No known prefix - return as-is
    return ("Misc", model_field)


def derive_equipment_type(labor_code: Optional[str]) -> str:
    """
    Derive equipment type from Ideal labor code.
    - 'lawn': LBR LABOR LAWN EQUIPMENT
    - '2cycle': LBRTC LABOR POWER EQUIPMENT 2 CYCLE / SMALL 4
    - 'other': everything else
    """
    if not labor_code:
        return "other"

    code_upper = labor_code.upper()

    if "LAWN EQUIPMENT" in code_upper or "LBR LABOR LAWN" in code_upper:
        return "lawn"
    elif "2 CYCLE" in code_upper or "2CYCLE" in code_upper or "LBRTC" in code_upper:
        return "2cycle"
    else:
        return "other"


def derive_status(comments: Optional[str], compl_date: Optional[str], in_date: Optional[str]) -> str:
    """
    Derive work order status from comments and dates.
    Check in order:
    1. Comments contain "UNDER WARRANTY" -> warranty
    2. Comments contain "NWF" or "NOTHING WRONG" -> nwf
    3. Comments empty and no flags -> review
    4. Has inDate but no complDate -> inprogress
    5. Otherwise -> completed
    """
    comments_upper = (comments or "").upper()

    # Check for warranty
    if "UNDER WARRANTY" in comments_upper or "WARRANTY" in comments_upper:
        return "warranty"

    # Check for NWF (Nothing Wrong Found or Not Worth Fixing)
    if "NWF" in comments_upper or "NOTHING WRONG" in comments_upper or "NOT WORTH" in comments_upper:
        return "nwf"

    # Check for empty comments
    if not comments or not comments.strip():
        return "review"

    # Check for in-progress (has in_date but no completion)
    if in_date and not compl_date:
        return "inprogress"

    return "completed"


def normalize_date(date_str: Optional[str]) -> Optional[str]:
    """
    Convert US date format (M/D/YYYY or MM/DD/YYYY) to ISO format (YYYY-MM-DD).
    Returns None if input is None or invalid.
    """
    if not date_str or not date_str.strip():
        return None

    date_str = date_str.strip()

    # Try common US formats
    formats = [
        "%m/%d/%Y",   # 03/25/2026
        "%m/%d/%y",   # 03/25/26
        "%m-%d-%Y",   # 03-25-2026
        "%m-%d-%y",   # 03-25-26
    ]

    for fmt in formats:
        try:
            dt = datetime.strptime(date_str, fmt)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue

    # If nothing worked, return as-is (might already be ISO)
    if re.match(r'^\d{4}-\d{2}-\d{2}$', date_str):
        return date_str

    return None


def clean_text(text: Optional[str]) -> str:
    """Clean up extracted text - remove excess whitespace, normalize."""
    if not text:
        return ""
    # Collapse multiple spaces/newlines into single space
    cleaned = re.sub(r'\s+', ' ', text)
    return cleaned.strip()


def normalize_work_order(raw_wo: dict) -> dict:
    """
    Normalize a raw extracted work order dict into the final WorkOrder schema.
    """
    # Extract and normalize manufacturer from model field
    mfr, model = normalize_manufacturer(raw_wo.get("model", ""))

    # Get labor code for type derivation
    labor_code = raw_wo.get("labor_code", "")

    # Normalize dates
    in_date = normalize_date(raw_wo.get("in_date"))
    start_date = normalize_date(raw_wo.get("start_date"))
    compl_date = normalize_date(raw_wo.get("compl_date"))
    out_date = normalize_date(raw_wo.get("out_date"))

    # Clean comments
    comments = clean_text(raw_wo.get("comments", ""))

    # Derive status and type
    status = derive_status(comments, compl_date, in_date)
    eq_type = derive_equipment_type(labor_code)

    return {
        "id": raw_wo.get("id", "").strip(),
        "customerId": raw_wo.get("customer_id", "").strip(),
        "customer": clean_text(raw_wo.get("customer", "")),
        "tag": raw_wo.get("tag", "").strip(),
        "tech": raw_wo.get("tech", "").strip(),
        "inDate": in_date,
        "startDate": start_date,
        "complDate": compl_date,
        "outDate": out_date,
        "mfr": mfr,
        "model": model,
        "desc": clean_text(raw_wo.get("desc", "")),
        "serial": raw_wo.get("serial", "").strip(),
        "type": eq_type,
        "status": status,
        "comments": comments,
    }
