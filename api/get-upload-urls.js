import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

const BLOCKED_EXTENSIONS = ['.exe', '.mp4', '.zip', '.bat', '.cmd', '.sh', '.msi', '.rar', '.7z'];
const MAX_FILES = 5;
const MAX_TOTAL_BYTES = 25 * 1024 * 1024; // 25 MB

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { formId, files } = req.body; // Expects array of { name, size, type }

  if (!Array.isArray(files) || files.length > MAX_FILES) {
    return res.status(400).json({ error: 'Maximum of 5 files allowed.' });
  }

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);
  if (totalSize > MAX_TOTAL_BYTES) {
    return res.status(400).json({ error: 'Total upload size cannot exceed 25MB.' });
  }

  const signedUploads = [];

  for (const file of files) {
    const lowerName = file.name.toLowerCase();
    if (BLOCKED_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) {
      return res.status(400).json({ error: `Unsupported or unsafe file format: ${file.name}` });
    }

    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `form-${formId}/${Date.now()}-${cleanName}`;

    const { data, error } = await supabaseAdmin.storage
      .from('elmivet-quotes')
      .createSignedUploadUrl(filePath);

    if (error) return res.status(500).json({ error: error.message });

    signedUploads.push({
      originalName: file.name,
      path: filePath,
      token: data.token,
    });
  }

  return res.status(200).json({ uploads: signedUploads });
}