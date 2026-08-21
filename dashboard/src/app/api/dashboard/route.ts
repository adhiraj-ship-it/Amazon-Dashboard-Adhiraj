import { NextRequest, NextResponse } from "next/server";
import { BRANDS, type Brand } from "@/lib/config";
import { getDashboardData } from "@/lib/getDashboardData";

export const revalidate = 60;

function isBrand(value: string | null): value is Brand {
  return !!value && (BRANDS as readonly string[]).includes(value);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const brandParam = searchParams.get("brand");
  const start = searchParams.get("start") ?? undefined;
  const end = searchParams.get("end") ?? undefined;

  if (!isBrand(brandParam)) {
    return NextResponse.json(
      { error: `Missing or invalid "brand" query param. Expected one of: ${BRANDS.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const data = await getDashboardData(brandParam, { start, end });
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
