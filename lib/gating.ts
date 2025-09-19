import { prisma } from "@/lib/prisma";

export async function userHasActiveEntitlement(userId: string) {
  const entitlement = await prisma.entitlement.findFirst({
    where: {
      userId,
      status: "active"
    },
    orderBy: { createdAt: "desc" }
  });

  return entitlement ?? null;
}
