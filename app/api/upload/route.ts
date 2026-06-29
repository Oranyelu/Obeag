import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Strict 1MB size limit (1,048,576 bytes)
    if (file.size > 1024 * 1024) {
      return NextResponse.json({ error: 'File exceeds the 1MB size limit' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique safe filename
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const filename = `${uniqueSuffix}-${safeName}`;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase credentials are not configured' }, { status: 500 });
    }

    // Upload directly to Supabase Storage bucket 'obeag-uploads'
    const uploadRes = await fetch(
      `${supabaseUrl}/storage/v1/object/obeag-uploads/${filename}`,
      {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: buffer,
      }
    );

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error('Supabase Storage upload error:', errText);
      return NextResponse.json({ error: `Supabase upload failed: ${errText}` }, { status: 500 });
    }

    // Return the public URL
    const fileUrl = `${supabaseUrl}/storage/v1/object/public/obeag-uploads/${filename}`;
    return NextResponse.json({ url: fileUrl });

  } catch (error: any) {
    console.error('File upload API error:', error);
    return NextResponse.json({ error: error.message || 'Failed to upload file' }, { status: 500 });
  }
}
