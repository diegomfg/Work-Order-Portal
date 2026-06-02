"""
Test script for the Ideal DMS PDF parser.

Usage:
    python test_parser.py           # Run test against sample PDF
    python test_parser.py --verbose # Show detailed output
"""

import sys
import json
from pathlib import Path

# Add current dir to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from pdf_parser import parse_ideal_pdf

# Sample PDF path
SAMPLE_PDF = Path(__file__).parent.parent / "samples" / "Work Order History List from March 25 until April 1 (one week).pdf"


def test_parser(verbose: bool = False):
    """Test the parser against the sample PDF."""
    if not SAMPLE_PDF.exists():
        print(f"ERROR: Sample PDF not found at {SAMPLE_PDF}")
        print("Expected location:", SAMPLE_PDF)
        return False

    print(f"Testing parser with: {SAMPLE_PDF.name}")
    print("-" * 60)

    # Read and parse the PDF
    with open(SAMPLE_PDF, "rb") as f:
        pdf_bytes = f.read()

    work_orders = parse_ideal_pdf(pdf_bytes)
    print(f"Parsed {len(work_orders)} work orders")

    if verbose:
        # Show first 5 work orders
        print("\n=== SAMPLE WORK ORDERS ===")
        for i, wo in enumerate(work_orders[:5]):
            print(f"\n--- WO #{i+1}: {wo['id']} ---")
            print(json.dumps(wo, indent=2))

    # Calculate stats
    statuses = {}
    types = {}
    mfrs = {}
    for wo in work_orders:
        statuses[wo["status"]] = statuses.get(wo["status"], 0) + 1
        types[wo["type"]] = types.get(wo["type"], 0) + 1
        mfrs[wo["mfr"]] = mfrs.get(wo["mfr"], 0) + 1

    print("\n=== SUMMARY ===")
    print(f"Total work orders: {len(work_orders)}")
    print(f"\nBy status:")
    for status, count in sorted(statuses.items()):
        print(f"  {status}: {count}")
    print(f"\nBy type:")
    for eq_type, count in sorted(types.items()):
        print(f"  {eq_type}: {count}")
    print(f"\nManufacturers found ({len(mfrs)}):")
    print(f"  {', '.join(sorted(mfrs.keys()))}")

    # Basic validation
    print("\n=== VALIDATION ===")
    errors = []

    # Check required fields
    for wo in work_orders:
        if not wo.get("id"):
            errors.append(f"Missing WO ID in work order")
        if not wo.get("customer"):
            errors.append(f"WO {wo.get('id')}: Missing customer name")
        if not wo.get("inDate"):
            errors.append(f"WO {wo.get('id')}: Missing in date")

    if errors:
        print(f"Found {len(errors)} validation errors:")
        for err in errors[:10]:
            print(f"  - {err}")
    else:
        print("All work orders passed validation.")

    return len(errors) == 0


if __name__ == "__main__":
    verbose = "--verbose" in sys.argv or "-v" in sys.argv
    success = test_parser(verbose)
    sys.exit(0 if success else 1)
