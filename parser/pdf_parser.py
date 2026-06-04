"""
PDF extraction logic for Ideal DMS Work Order History List exports.
Uses pdfplumber to extract text, then regex patterns to parse fields.
"""

import io
import re
from typing import Optional
import pdfplumber

from normalizer import normalize_work_order


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract all text from PDF, joining pages with newlines."""
    full_text = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                full_text.append(text)
    return "\n".join(full_text)


def split_into_blocks(full_text: str) -> list[str]:
    """
    Split the full PDF text into individual work order blocks.
    Each block starts with "Work Order Information".
    """
    # Split on "Work Order Information" header
    blocks = re.split(r'Work Order Information', full_text, flags=re.IGNORECASE)
    # First element is header/preamble, skip it
    return [b.strip() for b in blocks[1:] if b.strip()]


def extract_field(block: str, pattern: str, group: int = 1) -> Optional[str]:
    """Extract a single field using regex pattern."""
    match = re.search(pattern, block, re.IGNORECASE | re.MULTILINE)
    if match:
        return match.group(group).strip()
    return None


# Common field labels that can appear on the same line and should terminate extraction
FIELD_TERMINATORS = r'(?=\s*(?:Tech:|Priority:|Failure Date:|In Date:|Out Date:|Start Date:|Compl\.? Date:|Est\.? Compl:|Meter:|Serial|Model:|Mfr:|Description:|Tax|Labor|Parts|Extras|Amounts|Comments|Notifications|First:|Second:|\d+\.\d{2}$))'


def extract_customer_info(block: str) -> tuple[Optional[str], Optional[str]]:
    """
    Extract customer ID and customer name.
    Format in PDF: "Customer: 7342 ORELLANA, YURI Failure Date: ..."

    Customer names can be:
    - ALL CAPS: "ORELLANA, YURI" or "PROJECT XEROFITUS LLC"
    - Mixed case: "Rodriguez, Erasto" or "Mayon, Valentin"

    The challenge is that PDF extraction sometimes merges columns:
    "GREENWORX LANDSCAPING SERVFICaEiluSre Date" (SERVICES + Failure merged)

    Strategy: Look for text between customer ID and "Failure Date" marker,
    handling both clean separation and merged text.
    """
    # Try pattern 1: Clean separation with "Failure Date:"
    clean_match = re.search(
        r'Customer:\s*(\d+)\s+(.+?)\s+Failure Date:',
        block,
        re.IGNORECASE
    )
    if clean_match:
        customer_id = clean_match.group(1).strip()
        customer_name = clean_match.group(2).strip().rstrip(' ,.')
        if customer_name and len(customer_name) >= 2:
            return (customer_id, customer_name)

    # Try pattern 2: Merged text - look for pattern disruption
    # "SERVFICaEiluSre" has unexpected lowercase after caps in a weird position
    merged_match = re.search(
        r'Customer:\s*(\d+)\s+([A-Z0-9][A-Za-z0-9\s,\.\'\-&]+)',
        block
    )
    if merged_match:
        customer_id = merged_match.group(1).strip()
        customer_name = merged_match.group(2).strip()

        # Detect merged text: uppercase followed by mixed case pattern like "FICaE" or "LLFCa"
        # This is a pattern where PDF columns overlap
        merged_pattern = re.search(r'[A-Z]{2,}[a-z][A-Z][a-z]', customer_name)
        if merged_pattern:
            # Cut before the merged part
            cut_pos = merged_pattern.start()
            # Go back to find the start of the corrupted word
            while cut_pos > 0 and customer_name[cut_pos-1] not in ' ,':
                cut_pos -= 1
            customer_name = customer_name[:cut_pos].strip()

        # Also handle standard "Failure" if present
        customer_name = re.sub(r'\s*Failure.*$', '', customer_name, flags=re.IGNORECASE)
        customer_name = customer_name.rstrip(' ,.')

        if customer_name and len(customer_name) >= 2:
            return (customer_id, customer_name)

    # Fallback - just get the ID
    customer_id = extract_field(block, r'Customer:\s*(\d+)')
    return (customer_id, None)


def extract_comments(block: str) -> str:
    """
    Extract the comments/technician notes block.
    In Ideal PDFs, comments appear interleaved with amount columns.

    Examples from raw text:
    - "First: Second: NWF Parts 0.00"  -> "Nothing wrong found."
    - "First: Second: LABOR TO REPLACE... Parts 32.99" + "Est. Compl: LABOR CHARGE Labor 0.00"
    - "TECH REPLACED SET OF PICKUP BODIES Parts 38.81" + "FILTER TANK VENT. TECH TESTED UNIT Labor"
    """
    fragments = []
    seen = set()  # Track seen fragments to avoid duplicates

    def add_fragment(text: str):
        """Add a fragment if it's valid and not a duplicate."""
        text = text.strip()
        if text and len(text) >= 2 and text.upper() not in seen:
            # Skip field-like text
            if re.match(r'^(?:Equipment|First:|Second:|Comments|Amounts|Notifications)', text, re.IGNORECASE):
                return
            seen.add(text.upper())
            fragments.append(text)

    # Pattern 1: Simple NWF after "First: Second:"
    simple_nwf = re.search(r'First:\s*Second:\s*NWF\s+Parts', block, re.IGNORECASE)
    if simple_nwf:
        # Check if there are additional comment patterns
        has_more = re.search(r'(?:TECH\s+|UNIT\s+|REPLACED\s+|REPAIRED\s+|NOTHING\s+WRONG|NOT\s+WORTH)', block, re.IGNORECASE)
        if not has_more:
            return "Nothing wrong found."
        else:
            add_fragment("NWF")

    # Pattern 2: Text after "First: Second:" before "Parts" (excluding "NWF" which is handled above)
    first_match = re.search(
        r'First:\s*Second:\s*(?!NWF\s)([A-Z][A-Z0-9\s\.\,\-\']+?)(?=\s+Parts\s+[\d\.])',
        block,
        re.IGNORECASE
    )
    if first_match:
        add_fragment(first_match.group(1))

    # Pattern 3: Text before "Parts XX.XX" on standalone comment lines
    parts_matches = re.findall(
        r'^([A-Z][A-Z0-9\s\.\,\-\']+?)\s+Parts\s+[\d\.]+',
        block,
        re.IGNORECASE | re.MULTILINE
    )
    for match in parts_matches:
        # Skip if it contains field labels
        if not re.search(r'(?:First:|Second:|Equipment|Start Date:|Notifications|Comments|Amounts)', match, re.IGNORECASE):
            add_fragment(match)

    # Pattern 4: Text before "Labor XX.XX" (continuation comments)
    labor_matches = re.findall(
        r'(?:Est\.?\s*Compl:\s*)?([A-Z][A-Z0-9\s\.\,\-\']+?)\s+Labor\s+[\d\.]+',
        block,
        re.IGNORECASE | re.MULTILINE
    )
    for match in labor_matches:
        # Skip if it's field data or labor code
        if not re.search(r'(?:LBRTC|LBR LABOR|POWER EQUIPMENT|LAWN EQUIPMENT|2 CYCLE|Est\.? Compl)', match, re.IGNORECASE):
            add_fragment(match)

    # Pattern 5: Standalone continuation lines (like "AND RAN FINE.")
    for line in block.split('\n'):
        line = line.strip()
        if re.match(r'^(?:AND\s+RAN|RAN\s+FINE|TESTED\s+AND)', line, re.IGNORECASE):
            cleaned = re.sub(r'\s*(?:Parts|Labor|Tax|Extras)\s+[\d\.]+\s*$', '', line, flags=re.IGNORECASE)
            add_fragment(cleaned)

    # Pattern 6: Warranty phrases
    warranty_match = re.search(
        r'((?:UNIT\s+)?(?:REPAIRED\s+)?UNDER\s+(?:MANUFACTURER\s+)?WARRANTY)',
        block,
        re.IGNORECASE
    )
    if warranty_match:
        add_fragment(warranty_match.group(1))

    # Pattern 7: "NOTHING WRONG" or "NOT WORTH FIXING" phrases
    nwf_match = re.search(
        r'(NOTHING\s+WRONG(?:\s+FOUND)?|(?:UNIT\s+)?(?:DEEMED\s+)?NOT\s+WORTH(?:\s+FIXING)?)',
        block,
        re.IGNORECASE
    )
    if nwf_match:
        add_fragment(nwf_match.group(1))

    # Join and clean up
    if not fragments:
        return ""

    comment = ' '.join(fragments)

    # Clean up
    comment = re.sub(r'\s+', ' ', comment)  # Collapse whitespace
    comment = re.sub(r'\s*\.\s*\.+', '.', comment)  # Multiple periods
    comment = re.sub(r'\s*,\s*,+', ',', comment)  # Multiple commas
    comment = comment.strip(' .,')

    # Add sentence ending
    if comment and not comment.endswith('.'):
        comment += '.'

    # Capitalize
    if comment:
        comment = comment[0].upper() + comment[1:]

    return comment


def extract_labor_code(block: str) -> Optional[str]:
    """
    Extract labor code for equipment type derivation.
    Look for lines containing "LBR" labor codes.
    """
    # Look for lawn equipment labor
    if re.search(r'LBR\s+LABOR\s+LAWN', block, re.IGNORECASE):
        return "LBR LABOR LAWN EQUIPMENT"

    # Look for 2-cycle labor
    if re.search(r'LBRTC|2\s*CYCLE', block, re.IGNORECASE):
        return "LBRTC LABOR POWER EQUIPMENT 2 CYCLE"

    return None


def parse_work_order_block(block: str) -> dict:
    """Parse a single work order block into a raw field dict."""

    # Extract basic fields with regex - stop at next field label
    wo_id = extract_field(block, r'WO ID:\s*(\d+)')

    # Tag # stops at Tech:
    tag = extract_field(block, r'Tag #:\s*([A-Z0-9\-]+)')

    tech = extract_field(block, r'Tech:\s*([A-Z]{2,3})')

    # Dates - just grab the date pattern
    in_date = extract_field(block, r'In Date:\s*([\d/]+)')
    start_date = extract_field(block, r'Start Date:\s*([\d/]+)')
    compl_date = extract_field(block, r'Compl\.?\s*Date:\s*([\d/]+)')
    out_date = extract_field(block, r'Out Date:\s*([\d/]+)')

    # Mfr code - 2-4 uppercase letters
    mfr_code = extract_field(block, r'Mfr:\s*([A-Z&]{2,4})')

    # Model - stops at "Est. Compl" or end of recognizable model pattern
    model = extract_field(block, r'Model:\s*([A-Z0-9\-\s]+?)(?=\s+Est\.|\s+Compl|\s*$)')
    if model:
        model = model.strip()

    # Serial - stops at "Meter:" or similar
    serial = extract_field(block, r'Serial(?:/Vin)?:\s*([A-Z0-9\-\s]+?)(?=\s+Meter:|\s+Compl\.|\s*$)')
    if serial:
        serial = serial.strip()

    # Description - stops at "Out Date:" or similar
    desc = extract_field(block, r'Description:\s*([A-Z0-9\-\s\"\'\(\)\/]+?)(?=\s+Out Date:|\s+Tax|\s*$)')
    if desc:
        desc = desc.strip()

    # Customer info
    customer_id, customer = extract_customer_info(block)

    # Comments
    comments = extract_comments(block)

    # Labor code for type derivation
    labor_code = extract_labor_code(block)

    # Construct full model with mfr prefix for normalizer
    full_model = ""
    if mfr_code and model:
        full_model = f"{mfr_code} {model}"
    elif mfr_code:
        full_model = mfr_code
    elif model:
        full_model = model

    return {
        "id": wo_id or "",
        "customer_id": customer_id or "",
        "customer": customer or "",
        "tag": tag or "",
        "tech": tech or "",
        "in_date": in_date,
        "start_date": start_date,
        "compl_date": compl_date,
        "out_date": out_date,
        "model": full_model,
        "desc": desc or "",
        "serial": serial or "",
        "labor_code": labor_code,
        "comments": comments,
    }


def parse_ideal_pdf(pdf_bytes: bytes) -> list[dict]:
    """
    Parse an Ideal DMS Work Order History PDF into a list of WorkOrder dicts.

    Args:
        pdf_bytes: Raw PDF file content as bytes

    Returns:
        List of normalized WorkOrder dictionaries
    """
    # Extract full text from PDF
    full_text = extract_text_from_pdf(pdf_bytes)

    if not full_text:
        return []

    # Split into individual work order blocks
    blocks = split_into_blocks(full_text)

    # Parse and normalize each block
    work_orders = []
    for block in blocks:
        raw_wo = parse_work_order_block(block)

        # Skip blocks that don't have a WO ID (probably noise)
        if not raw_wo.get("id"):
            continue

        normalized = normalize_work_order(raw_wo)
        work_orders.append(normalized)

    return work_orders
