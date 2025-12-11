import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import Logger from "@/lib/logger";

const log = Logger.get("API:CronCleanup");

export const dynamic = 'force-dynamic'; // Ensure not cached

export async function GET(req: Request) {
    try {
        log.info("Cleanup job started");
        // Authenticate cron request via Bearer token (optional security for exposed endpoints)
        const authHeader = req.headers.get('authorization');
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            log.warn("Unauthorized cron attempt");
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 7); // 7 days ago

        // Fetch candidate events that might be expired.
        // We filter in memory for complex logic (e.g. checking "latest slot end time" vs cutoff).
        const candidateEvents = await prisma.event.findMany({
            where: {
                OR: [
                    { status: 'FINALIZED' },
                    {
                        // Check non-finalized events with at least one slot
                        timeSlots: { some: {} }
                    }
                ]
            },
            include: {
                timeSlots: true
            }
        });

        const eventsToDelete = candidateEvents.filter(event => {
            if (event.status === 'FINALIZED') {
                if (!event.finalizedSlotId) return false;
                const slot = event.timeSlots.find(s => s.id === event.finalizedSlotId);
                if (!slot) return false;
                return new Date(slot.startTime) < cutoff;
            } else {
                // For draft events: Delete if the LAST possible slot was over 7 days ago.
                if (event.timeSlots.length === 0) {
                    return new Date(event.createdAt) < cutoff; // Orphans
                }

                const lastEndTime = event.timeSlots.reduce((max, slot) => {
                    return slot.endTime > max ? slot.endTime : max;
                }, new Date(0));

                return lastEndTime < cutoff;
            }
        });

        let deletedCount = 0;
        let errors = 0;

        if (eventsToDelete.length > 0) {
            const { unpinChatMessage } = await import("@/lib/telegram");
            const token = process.env.TELEGRAM_BOT_TOKEN;

            for (const event of eventsToDelete) {
                try {
                    // Cleanup Telegram pins
                    if (event.telegramChatId && event.pinnedMessageId && token) {
                        await unpinChatMessage(event.telegramChatId, event.pinnedMessageId, token);
                    }

                    // Database Deletion
                    // Uses local transaction to ensure safe, cascading cleanup.
                    await prisma.$transaction(async (tx) => {
                        await tx.vote.deleteMany({ where: { timeSlot: { eventId: event.id } } });
                        await tx.timeSlot.deleteMany({ where: { eventId: event.id } });
                        await tx.participant.deleteMany({ where: { eventId: event.id } });
                        await tx.event.delete({ where: { id: event.id } });
                    });

                    log.info(`Deleted expired event: ${event.slug} (${event.title})`);
                    deletedCount++;
                } catch (e) {
                    log.error(`Failed to delete event ${event.slug}`, e as Error);
                    errors++;
                }
            }
        }

        return NextResponse.json({
            success: true,
            deleted: deletedCount,
            errors,
            scanned: candidateEvents.length
        });

    } catch (error) {
        log.error("Cron Error", error as Error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
