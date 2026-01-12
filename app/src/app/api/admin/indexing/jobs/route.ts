import { NextResponse } from "next/server";

const INDEXER_URL = process.env.INDEXER_URL || "http://localhost:8000";

export async function GET() {
  try {
    // Fetch active indexing jobs from the indexer service
    const response = await fetch(`${INDEXER_URL}/status`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Indexer unavailable");
    }

    const status = await response.json();

    // Return active jobs
    return NextResponse.json(status.active_jobs || []);
  } catch (error) {
    console.error("Jobs fetch error:", error);
    return NextResponse.json([]);
  }
}
