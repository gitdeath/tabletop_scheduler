import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic'; // Ensure not cached

export async function GET(req: Request) {
    try {
        // Authenticate cron request (optional, but good practice. For now, we might skipping secret for simplicity or assume local/Internal)
        // If user wants security, we can check CRON_SECRET from header.
        const authHeader = req.headers.get('authorization');
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 7); // 7 days ago

        // We need to fetch events and filter in code because of complex logic involving relation aggregates which Prisma doesn't always make easy in one query for flexible "MAX" without Raw SQL.
        // Or we can try to be clever.
        // Let's fetch all events that COULD be old (e.g. created > 7 days ago is a prerequisite, though updated is better).
        // Actually, just fetching all active events isn't too expensive for this app scale.

        const candidateEvents = await prisma.event.findMany({
            where: {
                OR: [
                    { status: 'FINALIZED' },
                    {
                        // For non-finalized, we need to check their slots.
                        // We can filter those who have NO slots later, or treat them as cleanup targets if old enough.
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
                if (!event.finalizedSlotId) return false; // Should not happen if valid
                const slot = event.timeSlots.find(s => s.id === event.finalizedSlotId);
                if (!slot) return false;
                return new Date(slot.startTime) < cutoff;
            } else {
                // Not Finalized: Check if the LATEST slot is still in the past (older than 7 days)
                // If no slots, maybe check updatedAt? Let's stick to slots for now.
                if (event.timeSlots.length === 0) {
                    // If no slots and created > 7 days ago, maybe kill it? 
                    // Let's say yes to keep DB clean.
                    return new Date(event.createdAt) < cutoff;
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
                    // Unpin logic
                    if (event.telegramChatId && event.pinnedMessageId && token) {
                        await unpinChatMessage(event.telegramChatId, event.pinnedMessageId, token);
                    }

                    // Database Cleanup
                    // Manual cascade just to be safe, though we added delete cascade to deletion logic in action.
                    // We can reuse deleteEvent logic? But `deleteEvent` is a server action, might redirect or use different return types.
                    // Better to duplicate the safe deletion logic here or extract it to a shared lib function.
                    // For now, let's just do transaction here.

                    await prisma.$transaction(async (tx) => {
                        await tx.vote.deleteMany({ where: { timeSlot: { eventId: event.id } } });
                        await tx.timeSlot.deleteMany({ where: { eventId: event.id } });
                        await tx.participant.deleteMany({ where: { eventId: event.id } });
                        await tx.event.delete({ where: { id: event.id } });
                    });

                    console.log(`[Cron] Deleted expired event: ${event.slug} (${event.title})`);
                    deletedCount++;
                } catch (e) {
                    console.error(`[Cron] Failed to delete event ${event.slug}`, e);
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
        console.error("[Cron] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
