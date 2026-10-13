// Короткая ссылка из рекламного поста: считает переход и отправляет человека к рекламодателю.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: { code: string } }) {
  const placement = await prisma.placement.findUnique({ where: { shortCode: params.code }, include: { order: true } });
  if (!placement) return NextResponse.redirect(new URL("/", process.env.APP_URL || "http://localhost:3000"));
  if (placement.status === "PUBLISHED" || placement.status === "COMPLETED" || placement.status === "ACCEPTED") {
    await prisma.placement.update({
      where: { id: placement.id },
      data: { clicks: { increment: 1 }, clickEvents: { create: {} } },
    });
  }
  return NextResponse.redirect(placement.order.link, 302);
}
