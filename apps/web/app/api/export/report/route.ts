import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ message: "Report export pending implementation" }, { status: 501 });
}
