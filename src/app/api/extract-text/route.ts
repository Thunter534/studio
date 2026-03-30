import mammoth from 'mammoth';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return Response.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const fileName = file.name.toLowerCase();
    const isTextFile = file.type === 'text/plain' || fileName.endsWith('.txt');
    const isPdfFile = file.type === 'application/pdf' || fileName.endsWith('.pdf');
    const isDocxFile =
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      || fileName.endsWith('.docx');

    if (!isTextFile && !isPdfFile && !isDocxFile) {
      return Response.json(
        { error: 'Only .txt, .pdf, and .docx files are supported' },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    let text = '';

    if (isTextFile) {
      text = new TextDecoder().decode(buffer);
    } else if (isPdfFile) {
      // Load PDF parser lazily so non-PDF requests do not fail at route load time.
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: Buffer.from(buffer) });
      const result = await parser.getText();
      await parser.destroy();
      text = result.text;
    } else {
      const result = await mammoth.extractRawText({
        buffer: Buffer.from(buffer),
      });
      text = result.value;
    }

    return Response.json({ text });
  } catch (error) {
    console.error("Text extraction error:", error);
    return Response.json(
      {
        error: "Failed to extract text",
        details: error instanceof Error ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
