import { NextResponse } from "next/server";

const INDEXER_URL = process.env.INDEXER_URL || "http://localhost:8000";
const DOCUMENTS_DIR = process.env.DOCUMENTS_DIR || "/app/documents";

export async function POST() {
  try {
    // Trigger reindexing on the indexer service
    const response = await fetch(`${INDEXER_URL}/index/directory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        directory_path: DOCUMENTS_DIR,
        recursive: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: "Réindexation démarrée",
      job_id: result.job_id,
      files_queued: result.files_queued,
    });
  } catch (error) {
    console.error("Reindex error:", error);
    return NextResponse.json(
      { error: "Impossible de démarrer la réindexation" },
      { status: 500 }
    );
  }
}
