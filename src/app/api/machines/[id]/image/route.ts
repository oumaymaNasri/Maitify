import { NextResponse } from "next/server";

import { requireSessionAction } from "@/lib/auth/session-server";
import { prisma } from "@/lib/db/prisma";
import { resolveMachineImageUrl } from "@/lib/gmao/machine-image";
import { imageResponseFromStoredUrl } from "@/lib/media/image-api";

type RouteContext = { params: { id: string } };

export async function GET(_request: Request, { params }: RouteContext) {
  const auth = requireSessionAction();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 403 });

  const machine = await prisma.machine.findUnique({
    where: { id: params.id },
    select: {
      galleryImageUrls: true,
      photos: { take: 8, orderBy: { sortOrder: "asc" }, select: { url: true } },
    },
  });

  if (!machine) return new NextResponse(null, { status: 404 });

  const stored = resolveMachineImageUrl(machine.photos, machine.galleryImageUrls);
  const response = imageResponseFromStoredUrl(stored);
  if (!response) return new NextResponse(null, { status: 404 });

  return response;
}
