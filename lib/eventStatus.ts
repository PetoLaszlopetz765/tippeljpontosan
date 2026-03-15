import { prisma } from "@/lib/db";

const OPEN_STATUSES = ["OPEN", "NYITOTT"];

export async function autoCloseStartedEvents(now: Date = new Date()) {
  const result = await prisma.event.updateMany({
    where: {
      status: { in: OPEN_STATUSES },
      kickoffTime: { lte: now },
    },
    data: {
      status: "CLOSED",
    },
  });

  return result.count;
}
