/**
 * Helper to manage files in Supabase Storage bucket 'obeag-uploads'
 */
export async function deleteStorageFile(fileUrl?: string | null): Promise<boolean> {
  if (!fileUrl) return false;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase credentials missing, cannot delete storage file');
    return false;
  }

  // Only delete files belonging to our Supabase bucket
  const bucketPath = '/storage/v1/object/public/obeag-uploads/';
  if (!fileUrl.includes(bucketPath)) {
    return false;
  }

  try {
    const filename = fileUrl.split(bucketPath)[1];
    if (!filename) return false;

    // Delete single object via Supabase REST API
    const res = await fetch(`${supabaseUrl}/storage/v1/object/obeag-uploads/${filename}`, {
      method: 'DELETE',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`Failed to delete Supabase storage object ${filename}:`, errText);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error deleting Supabase storage file:', err);
    return false;
  }
}
