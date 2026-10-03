import { NextResponse } from "next/server";

import { requireSessionAction } from "@/lib/auth/session-server";
import { prisma } from "@/lib/db/prisma";
import { imageResponseFromStoredUrl } from "@/lib/media/image-api";

type RouteContext = { params: { id: string } };

export async function GET(_request: Request, { params }: RouteContext) {
  const auth = requireSessionAction();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 403 });

  const technician = await prisma.technician.findUnique({
    where: { id: params.id },
    select: { imageUrl: true },
  });

  if (!technician) return new NextResponse(null, { status: 404 });

  const response = imageResponseFromStoredUrl(technician.imageUrl);
  if (!response) return new NextResponse(null, { status: 404 });

  return response;
}
