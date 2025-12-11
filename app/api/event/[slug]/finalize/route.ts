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
            const { buildFinalizedMessage } = await import("@/lib/eventMessage");
            const slotTime = event.timeSlots.find((s: any) => s.id === parseInt(slotId.toString()))!;

            // Unpin the previous voting message if it exists
            if (event.pinnedMessageId) {
                await unpinChatMessage(event.telegramChatId, event.pinnedMessageId, process.env.TELEGRAM_BOT_TOKEN);
            }

            // Determine origin: Headers only (Dynamic)
            const { getBaseUrl } = await import("@/lib/url");
            const origin = getBaseUrl(req.headers);

            const msg = buildFinalizedMessage(event, slotTime, origin);

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
