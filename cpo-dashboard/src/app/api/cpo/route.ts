import { NextResponse } from "next/server";
import { getCpoData } from "@/lib/cpo/getCpoData";

export const revalidate = 60;

export async function GET() {
  try {
    const data = await getCpoData();
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
