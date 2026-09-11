import { NextResponse } from "next/server";

import { authorizeApiRequest } from "@/lib/auth/session-server";
import { prisma } from "@/lib/db/prisma";
import { imageResponseFromStoredUrl } from "@/lib/media/image-api";

type RouteContext = { params: { id: string } };

export async function GET(_request: Request, { params }: RouteContext) {
  const auth = authorizeApiRequest();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 403 });

  const part = await prisma.sparePart.findUnique({
    where: { id: params.id },
    select: { imageUrl: true },
  });

  if (!part) return new NextResponse(null, { status: 404 });

  const response = imageResponseFromStoredUrl(part.imageUrl);
  if (!response) return new NextResponse(null, { status: 404 });

  return response;
}
