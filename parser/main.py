"""
FastAPI microservice for parsing Ideal DMS Work Order PDF exports.

Endpoints:
    POST /parse - Accept PDF upload, return parsed WorkOrder[] JSON
    GET /health - Health check endpoint

Run with:
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from pdf_parser import parse_ideal_pdf, is_ideal_work_order_report

app = FastAPI(
    title="Ideal DMS PDF Parser",
    description="Parses Work Order History List PDFs from Ideal DMS",
    version="1.0.0",
)

# Allow CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "ideal-pdf-parser"}


@app.post("/parse")
async def parse_pdf(file: UploadFile = File(...)):
    """
    Parse an Ideal DMS Work Order History PDF.

    Accepts a multipart/form-data PDF upload.
    Returns a JSON object with:
        - workorders: array of WorkOrder objects
        - count: number of work orders parsed
        - filename: original filename
    """
    # Validate file type
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only PDF files are accepted."
        )

    try:
        # Read file contents
        pdf_bytes = await file.read()

        if len(pdf_bytes) == 0:
            raise HTTPException(status_code=400, detail="Empty file uploaded")

        if not is_ideal_work_order_report(pdf_bytes):
            raise HTTPException(
                status_code=422,
                detail="This file does not appear to be a Work Order History Report from Ideal DMS. Please export the correct report and try again."
            )

        # Parse the PDF
        work_orders = parse_ideal_pdf(pdf_bytes)

        return JSONResponse(content={
            "workorders": work_orders,
            "count": len(work_orders),
            "filename": file.filename,
        })

    except HTTPException:
        raise
    except Exception as e:
        # Log the error for debugging
        print(f"Error parsing PDF: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse PDF: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
