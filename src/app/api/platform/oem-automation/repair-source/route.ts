import { NextResponse } from "next/server";
import { z } from "zod";

import { requirePlatformAdmin } from "@/lib/platform";
import { isPlatformOemAutomationUiEnabled } from "@/lib/oem-automation-sources";
import { getRepairSourcePrompt } from "@/server/platform/oem-automation";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  sourceName: z.string().min(1),
  sampleResponse: z.string().optional(),
});

/** Platform admin: Cursor-assisted repair prompt for broken OEM source. */
export async function POST(req: Request) {
  if (!isPlatformOemAutomationUiEnabled()) {
    return NextResponse.json({ error: "OEM automation UI disabled" }, { status: 403 });
  }

  try {
    await requirePlatformAdmin();
  } catch {
    return NextResponse.json({ error: "Platform admin access required" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const result = await getRepairSourcePrompt(parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({
    source_name: parsed.data.sourceName,
    prompt: result.prompt,
  });
}
