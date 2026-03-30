import { readFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

/**
 * Serves the custom Kenao font binary to the client.
 * This is required for react-pdf to access the font file which is 
 * stored in the src/app/Fonts directory and not publicly accessible.
 */
export async function GET() {
  try {
    // Construct the path to the font file relative to the project root
    const fontPath = path.join(process.cwd(), 'src', 'app', 'Fonts', 'kenao.otf');
    const buffer = await readFile(fontPath);
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'font/otf',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('[Font API] Failed to load font:', error);
    return new NextResponse('Font not found', { status: 404 });
  }
}
