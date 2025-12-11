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

        // Location data
        const houseIdStr = formData.get("houseId");
        const houseName = formData.get("houseName")?.toString();
        const houseAddress = formData.get("houseAddress")?.toString();

        if (!slotId) {
            return NextResponse.json({ error: "Missing Slot ID" }, { status: 400 });
        }

        let finalizedHouseId: number | null = null;

        // 1. Handle House Selection or Creation
        if (houseIdStr) {
            finalizedHouseId = parseInt(houseIdStr.toString());
        } else if (houseName) {
            const newHouse = await prisma.house.create({
                data: {
                    name: houseName,
                    address: houseAddress || null,
                }
            });
            finalizedHouseId = newHouse.id;
        }

        const event = await prisma.event.update({
            where: { slug: params.slug },
            data: {
                status: "FINALIZED",
                finalizedSlotId: parseInt(slotId.toString()),
                finalizedHouseId: finalizedHouseId
            },
            include: {
                timeSlots: true,
                finalizedHouse: true
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

            let locString = "";
            if (event.finalizedHouse) {
                locString = `\n📍 <b>${event.finalizedHouse.name}</b>${event.finalizedHouse.address ? ` (${event.finalizedHouse.address})` : ""}`;
            }

            const msg = `🎉 <b>Event Finalized!</b>\n\n<b>${event.title}</b> is happening on:\n📅 ${slotTime.toDateString()}\n⏰ ${slotTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${locString}\n\n<a href="${icsLink}">📅 Add to Calendar</a>\n\nSee you there!`;

            const msgId = await sendTelegramMessage(event.telegramChatId, msg, process.env.TELEGRAM_BOT_TOKEN);
            if (msgId) {
                await pinChatMessage(event.telegramChatId, msgId, process.env.TELEGRAM_BOT_TOKEN);
            }
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Finalize failed:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
