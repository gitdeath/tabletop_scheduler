import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function POST(
    req: Request,
    { params }: { params: { slug: string } }
) {
    try {
        const formData = await req.formData();
        const slotId = formData.get("slotId");

        if (!slotId) {
            return NextResponse.json({ error: "Missing Slot ID" }, { status: 400 });
        }

        const event = await prisma.event.update({
            where: { slug: params.slug },
            data: {
                status: "FINALIZED",
                finalizedSlotId: parseInt(slotId.toString())
            },
            include: {
                timeSlots: true
            }
        });

        if (event.telegramChatId && process.env.TELEGRAM_BOT_TOKEN) {
            const { sendTelegramMessage, unpinChatMessage, pinChatMessage } = await import("@/lib/telegram");
            const slotTime = new Date(event.timeSlots.find((s: any) => s.id === parseInt(slotId.toString()))!.startTime);

            // Unpin the previous voting message if it exists
            if (event.pinnedMessageId) {
                await unpinChatMessage(event.telegramChatId, event.pinnedMessageId, process.env.TELEGRAM_BOT_TOKEN);
            }

            // Determine origin: Headers only (Dynamic)
            const host = req.headers.get("host") || "localhost:3000";
            const protocol = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
            const origin = `${protocol}://${host}`;

            const icsLink = `${origin}/api/event/${event.slug}/ics`;

            const msg = `🎉 <b>Event Finalized!</b>\n\n<b>${event.title}</b> is happening on:\n📅 ${slotTime.toDateString()}\n⏰ ${slotTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n\n<a href="${icsLink}">📅 Add to Calendar</a>\n\nSee you there!`;

            const msgId = await sendTelegramMessage(event.telegramChatId, msg, process.env.TELEGRAM_BOT_TOKEN);
            if (msgId) {
                await pinChatMessage(event.telegramChatId, msgId, process.env.TELEGRAM_BOT_TOKEN);
            }
        }

    } catch (error) {
        console.error("Finalize failed:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }

    // Redirect back to manage page
    redirect(`/e/${params.slug}/manage`);
}
