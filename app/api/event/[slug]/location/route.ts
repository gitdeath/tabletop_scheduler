import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getBaseUrl } from "@/lib/url";
import { buildFinalizedMessage } from "@/lib/eventMessage";
import { editMessageText } from "@/lib/telegram";

export async function POST(
    req: Request,
    { params }: { params: { slug: string } }
) {
    try {
        const { location } = await req.json();

        // Update the location
        const event = await prisma.event.update({
            where: { slug: params.slug },
            data: { location },
            include: {
                timeSlots: true,
                finalizedHost: true
            }
        });

        // If connected to Telegram and finalized, update the pinned message
        if (event.telegramChatId && event.pinnedMessageId && process.env.TELEGRAM_BOT_TOKEN && event.finalizedSlotId) {
            const slot = event.timeSlots.find(s => s.id === event.finalizedSlotId);
            if (slot) {
                const origin = getBaseUrl(req.headers);
                const msg = buildFinalizedMessage(event, slot, origin);

                await editMessageText(
                    event.telegramChatId,
                    event.pinnedMessageId,
                    msg,
                    process.env.TELEGRAM_BOT_TOKEN
                );
            }
        }

        return NextResponse.json({ success: true, location: event.location });
    } catch (error) {
        console.error("Location update failed:", error);
        return NextResponse.json({ error: "Failed to update location" }, { status: 500 });
    }
}
