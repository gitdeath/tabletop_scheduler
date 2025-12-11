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

        const now = new Date();
        const cutoff7Days = new Date(now);
        cutoff7Days.setDate(now.getDate() - 7);

        const cutoff1Day = new Date(now);
        cutoff1Day.setDate(now.getDate() - 1);

        // Fetch candidate events that might be expired.
        // We filter in memory for complex logic (e.g. checking "latest slot end time" vs cutoff).
        const candidateEvents = await prisma.event.findMany({
            where: {
                OR: [
                    { status: 'FINALIZED' },
                    { status: 'CANCELLED' },
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
            if (event.status === 'CANCELLED') {
                // Cancelled events: Delete 1 day after the event date
                if (event.finalizedSlotId) {
                    const slot = event.timeSlots.find(s => s.id === event.finalizedSlotId);
                    // If the slot time is before "yesterday" (now - 1 day), it's safe to delete
                    if (slot && new Date(slot.startTime) < cutoff1Day) return true;
                }
                // Fallback for cancelled events with no slot (unlikely) or just old updates
                return new Date(event.updatedAt) < cutoff7Days;
            }
            else if (event.status === 'FINALIZED') {
                // Finalized events: Keep for 7 days
                if (!event.finalizedSlotId) return false;
                const slot = event.timeSlots.find(s => s.id === event.finalizedSlotId);
                if (!slot) return false;
                return new Date(slot.startTime) < cutoff7Days;
            }
            else {
                // Drafts: Delete if stale for 7 days
                if (event.timeSlots.length === 0) {
                    return new Date(event.createdAt) < cutoff7Days; // Orphans
                }

                const lastEndTime = event.timeSlots.reduce((max, slot) => {
                    return slot.endTime > max ? slot.endTime : max;
                }, new Date(0));

                return lastEndTime < cutoff7Days;
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
