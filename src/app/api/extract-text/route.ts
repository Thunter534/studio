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

    // Only accept TXT files
    if (file.type !== "text/plain") {
      return Response.json(
        { error: "Only .txt files are supported" },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const text = new TextDecoder().decode(buffer);

    return Response.json({ text });
  } catch (error) {
    console.error("Text extraction error:", error);
    return Response.json(
      { error: "Failed to extract text" },
      { status: 500 }
    );
  }
}
