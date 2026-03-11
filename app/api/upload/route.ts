import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = "https://appcqbvzcfaqnptkxgdz.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGNxYnZ6Y2ZhcW5wdGt4Z2R6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzcxMzksImV4cCI6MjA3MjA1MzEzOX0.bnlYbRQNXU3vCGfcZ0FfN9h9X_Vx4fls5VLg7v8S9xg";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
  "application/rtf",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "video/mp4",
  "video/quicktime",
]);

const DOC_MAX = 25 * 1024 * 1024; // 25MB
const MEDIA_MAX = 50 * 1024 * 1024; // 50MB

function isMediaType(type: string): boolean {
  return type.startsWith("image/") || type.startsWith("video/");
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const token = formData.get("token") as string;
    const questionId = formData.get("question_id") as string;

    if (!token || !questionId) {
      return NextResponse.json(
        { error: "token and question_id are required" },
        { status: 400 }
      );
    }

    const files = formData.getAll("files") as File[];
    if (!files.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const uploaded: {
      name: string;
      path: string;
      size: number;
      type: string;
    }[] = [];
    const errors: string[] = [];

    for (const file of files) {
      if (!ALLOWED_TYPES.has(file.type)) {
        errors.push(`${file.name}: unsupported file type (${file.type})`);
        continue;
      }

      const maxSize = isMediaType(file.type) ? MEDIA_MAX : DOC_MAX;
      if (file.size > maxSize) {
        const limitMB = maxSize / (1024 * 1024);
        errors.push(`${file.name}: exceeds ${limitMB}MB limit`);
        continue;
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${token}/${questionId}/${Date.now()}-${safeName}`;

      const buffer = await file.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from("quickask-uploads")
        .upload(filePath, buffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        errors.push(`${file.name}: upload failed - ${uploadError.message}`);
        continue;
      }

      uploaded.push({
        name: file.name,
        path: filePath,
        size: file.size,
        type: file.type,
      });
    }

    return NextResponse.json({ files: uploaded, errors });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
