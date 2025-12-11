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
        const hostId = formData.get("houseId"); // Mapped from UI "houseId" to finalizedHostId
        const location = formData.get("location");

        if (!slotId) {
            return NextResponse.json({ error: "Missing Slot ID" }, { status: 400 });
        }

        const updateData: any = {
            status: "FINALIZED",
            finalizedSlotId: parseInt(slotId.toString()),
            location: location ? location.toString() : null
        };

        if (hostId) {
            updateData.finalizedHostId = parseInt(hostId.toString());
        }

        const event = await prisma.event.update({
            where: { slug: params.slug },
            data: updateData,
            include: {
                timeSlots: true,
                finalizedHost: true
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
            const { getBaseUrl } = await import("@/lib/url");
            const origin = getBaseUrl(req.headers);

            const icsLink = `${origin}/api/event/${event.slug}/ics`;

            let locString = event.location ? `\n📍 ${event.location}` : "";
            let hostString = event.finalizedHost ? `\n🏠 Hosted by <b>${event.finalizedHost.name}</b>` : "";

            const msg = `🎉 <b>Event Finalized!</b>\n\n<b>${event.title}</b> is happening on:\n📅 ${slotTime.toDateString()}\n⏰ ${slotTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${hostString}${locString}\n\n<a href="${icsLink}">📅 Add to Calendar</a>\n\nSee you there!`;

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
