import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique safe filename
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const filename = `${uniqueSuffix}-${safeName}`;

    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });

    // Write file to local disk
    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, buffer);

    // Return the accessible URL
    const fileUrl = `/uploads/${filename}`;
    return NextResponse.json({ url: fileUrl });

  } catch (error) {
    console.error('File upload API error:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
