import { NextRequest, NextResponse } from 'next/server';

const PARSER_URL = process.env.PARSER_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Only PDF files are accepted' },
        { status: 400 }
      );
    }

    // Forward the PDF to the Python parser microservice
    const parserFormData = new FormData();
    parserFormData.append('file', file);

    const parserResponse = await fetch(`${PARSER_URL}/parse`, {
      method: 'POST',
      body: parserFormData,
    });

    if (!parserResponse.ok) {
      const errorText = await parserResponse.text();
      console.error('Parser error:', errorText);
      return NextResponse.json(
        { error: 'Failed to parse PDF', details: errorText },
        { status: 502 }
      );
    }

    const result = await parserResponse.json();

    return NextResponse.json({
      workorders: result.workorders,
      filename: file.name,
      count: result.workorders?.length || 0,
    });
  } catch (error) {
    console.error('Error in parse route:', error);

    // Check if it's a connection error to the parser
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        { error: 'Cannot connect to PDF parser service. Make sure the Python parser is running.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process PDF upload' },
      { status: 500 }
    );
  }
}

// Increase body size limit for PDF uploads (default is 4MB)
export const config = {
  api: {
    bodyParser: false,
  },
};
