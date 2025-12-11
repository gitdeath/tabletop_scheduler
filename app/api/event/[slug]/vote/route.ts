import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import Logger from "@/lib/logger";

const log = Logger.get("API:Vote");

export async function POST(
    req: Request,
    { params }: { params: { slug: string } } // slug is actually eventId in route path /api/event/[id]/vote but we need to match folder structure
) {
    try {
        const eventId = parseInt(params.slug); // Since file is in /api/event/[slug]/vote, params.slug is the ID
        const body = await req.json();
        const { name, telegramId, votes, participantId } = body;

        if (!name || !votes || !Array.isArray(votes)) {
            log.warn("Invalid vote data", { eventId });
            return NextResponse.json({ error: "Invalid data" }, { status: 400 });
        }

        // Use a transaction to ensure participant exists and votes are recorded
        const result = await prisma.$transaction(async (tx: any) => {
            let participant;

            // 1. Check if updating existing participant
            if (participantId) {
                const existing = await tx.participant.findUnique({
                    where: { id: participantId }
                });

                // Security/Safety check: ensure participant belongs to this event
                if (existing && existing.eventId === eventId) {
                    participant = await tx.participant.update({
                        where: { id: participantId },
                        data: { name, telegramId }
                    });

                    // Clear old votes to replace with new ones
                    await tx.vote.deleteMany({
                        where: { participantId }
                    });
                }
            }

            // 2. If no valid existing participant found, create new
            if (!participant) {
                participant = await tx.participant.create({
                    data: {
                        eventId,
                        name,
                        telegramId,
                    },
                });
            }

            // 3. Create votes
            const voteData = votes.map((v: any) => ({
                participantId: participant.id,
                timeSlotId: v.slotId,
                preference: v.preference,
                canHost: v.canHost || false
            }));

            await tx.vote.createMany({
                data: voteData,
            });

            return participant;
        });

        // Fetch event to get telegramChatId and verify status
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: { timeSlots: { include: { votes: true } } }
        });

        if (event && event.telegramChatId && process.env.TELEGRAM_BOT_TOKEN) {
            const { sendTelegramMessage } = await import("@/lib/telegram");
            // Calculate status
            const yesCount = event.timeSlots[0]?.votes.filter((v: any) => v.preference === 'YES').length || 0; // Rough check (first slot?)
            // Actually, just announce the activity
            const userDisplay = telegramId ? `@${telegramId.replace('@', '')}` : name;
            await sendTelegramMessage(event.telegramChatId, `🚀 <b>${userDisplay}</b> just updated their availability for <b>${event.title}</b>!`, process.env.TELEGRAM_BOT_TOKEN);

            // --- PINNED MESSAGE DASHBOARD LOGIC ---
            const { editMessageText, pinChatMessage } = await import("@/lib/telegram");
            const { generateStatusMessage } = await import("@/lib/status");
            const participants = await prisma.participant.count({ where: { eventId } });

            // Detect URL dynamically
            const { getBaseUrl } = await import("@/lib/url");
            const { headers } = await import("next/headers");
            const headerList = headers();
            const baseUrl = getBaseUrl(headerList);
            const statusMsg = generateStatusMessage(event, participants, baseUrl);

            if (event.pinnedMessageId) {
                // Update existing pin
                await editMessageText(event.telegramChatId, event.pinnedMessageId, statusMsg, process.env.TELEGRAM_BOT_TOKEN);
            } else {
                // Create new pin
                const newMsgId = await sendTelegramMessage(event.telegramChatId, statusMsg, process.env.TELEGRAM_BOT_TOKEN);
                if (newMsgId) {
                    await pinChatMessage(event.telegramChatId, newMsgId, process.env.TELEGRAM_BOT_TOKEN);
                    // Save the pinned ID
                    await prisma.event.update({
                        where: { id: eventId },
                        data: { pinnedMessageId: newMsgId }
                    });
                }
            }
        }

        log.info(`Vote processed successfully`, { participantId: result.id, eventId });
        return NextResponse.json({ success: true, participantId: result.id });
    } catch (error) {
        log.error("Vote failed", error as Error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
