import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await context.params;
    const fileName = segments.join('/');

    const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads');
    const fullPath = path.resolve(uploadsDir, fileName);

    // Security: prevent path traversal attack
    if (!fullPath.startsWith(uploadsDir + path.sep)) {
      return new NextResponse('Not found', { status: 404 });
    }

    const file = await readFile(fullPath);

    // Determine content type from extension
    const ext = path.extname(fileName).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
    };

    const contentType =
      contentTypes[ext] ?? 'application/octet-stream';

    return new NextResponse(file, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
