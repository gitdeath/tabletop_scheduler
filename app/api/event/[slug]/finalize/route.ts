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

        // Fetch the current event status to determine if it's an update
        const currentEvent = await prisma.event.findUnique({
            where: { slug: params.slug },
            select: { status: true, telegramChatId: true, pinnedMessageId: true }
        });

        if (!currentEvent) {
            return NextResponse.json({ error: "Event not found" }, { status: 404 });
        }

        // 1. Check if already finalized (Update Mode)
        const isUpdate = currentEvent.status === 'FINALIZED';

        // 2. Handle Location (House)
        let finalizedHouseId: number | null = null;

        // If TBD (no houseName or houseId provided), finalizedHouseId remains null.
        // We do typically set it to TBD if we want explicit tracking, but for now null implies TBD.

        if (houseIdStr) {
            // Re-using existing house/location logic? 
            // The Refactor removed `existingHouses` ID passing in favor of creating new or "Custom".
            // But if `houseId` IS passed (maybe from future legacy support), handle it.
            // Actually, `FinalizeEvent` now sends `houseName` for hosts/custom.
            // It ONLY sends `houseId` if we kept the old logic? No, the new logic REMOVED houseId except... wait.
            // My new `FinalizeEvent` ONLY sends `houseName` and `houseAddress` for hosts/custom.
            // It removes `houseId` completely from the form submission for Hosts/Custom.
            // So we mostly rely on creating new House entries for these specific events, 
            // OR we could check if a House with that name already exists?
            // For simplicity/speed: Create new House record effectively acting as "Location Snapshot".

            // Wait, previous code had `houseId` logic. My new code DELETED the `selectedHouseId` logic for existing houses.
            // So `houseName` will be present.
            finalizedHouseId = parseInt(houseIdStr.toString());
        }

        if (houseName) {
            // Check if House exists? No, just create new one for this event to store the snapshot.
            // In a real app we might dedupe, but "Chris's Place" might change address.
            const newHouse = await prisma.house.create({
                data: {
                    name: houseName.toString(),
                    address: houseAddress ? houseAddress.toString() : null,
                }
            });
            finalizedHouseId = newHouse.id;
        }

        // 3. Update Event
        const updatedEvent = await prisma.event.update({
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

        // 4. Send Notification
        if (updatedEvent.telegramChatId && process.env.TELEGRAM_BOT_TOKEN) {
            const { sendTelegramMessage, unpinChatMessage, pinChatMessage } = await import("@/lib/telegram");
            const { getBaseUrl } = await import("@/lib/url");
            const { generateGoogleCalendarLink } = await import("@/lib/google-calendar");

            const origin = getBaseUrl(req.headers);
            const icsLink = `${origin}/api/event/${updatedEvent.slug}/ics`;

            // Re-fetch slot time
            const finalizedSlot = updatedEvent.timeSlots.find(s => s.id === updatedEvent.finalizedSlotId);
            if (!finalizedSlot) return NextResponse.json({ success: true }); // Should not happen

            const slotTime = new Date(finalizedSlot.startTime);

            const locationStr = updatedEvent.finalizedHouse
                ? `${updatedEvent.finalizedHouse.name}${updatedEvent.finalizedHouse.address ? `, ${updatedEvent.finalizedHouse.address}` : ""}`
                : undefined;

            const gCalLink = generateGoogleCalendarLink({
                title: updatedEvent.title,
                description: updatedEvent.description || "Game Night!",
                startTime: slotTime,
                endTime: new Date(slotTime.getTime() + (4 * 60 * 60 * 1000)),
                location: locationStr
            });

            let locString = "\n📍 <b>Location: TBD</b>";
            if (updatedEvent.finalizedHouse) {
                locString = `\n📍 <b>${updatedEvent.finalizedHouse.name}</b>${updatedEvent.finalizedHouse.address ? ` (${updatedEvent.finalizedHouse.address})` : ""}`;
            }

            let msg = "";
            if (isUpdate) {
                // Unpin the previous voting message if it exists (only if it was an update)
                if (currentEvent.pinnedMessageId) {
                    await unpinChatMessage(updatedEvent.telegramChatId, currentEvent.pinnedMessageId, process.env.TELEGRAM_BOT_TOKEN);
                }
                msg = `📍 <b>Location Update!</b>\n\n<b>${updatedEvent.title}</b>\n📅 ${slotTime.toDateString()} @ ${slotTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${locString}\n\n<a href="${gCalLink}">📅 Add to Google Calendar</a>\n<a href="${icsLink}">⬇️ Download .ics</a>`;
            } else {
                // Unpin the previous voting message if it exists (only if it was an initial finalize)
                if (currentEvent.pinnedMessageId) {
                    await unpinChatMessage(updatedEvent.telegramChatId, currentEvent.pinnedMessageId, process.env.TELEGRAM_BOT_TOKEN);
                }
                msg = `🎉 <b>Event Finalized!</b>\n\n<b>${updatedEvent.title}</b> is happening on:\n📅 ${slotTime.toDateString()}\n⏰ ${slotTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${locString}\n\n<a href="${gCalLink}">📅 Add to Google Calendar</a>\n<a href="${icsLink}">⬇️ Download .ics</a>\n\nSee you there!`;
            }

            const msgId = await sendTelegramMessage(updatedEvent.telegramChatId, msg, process.env.TELEGRAM_BOT_TOKEN);
            if (msgId) {
                // Pin logic for both initial finalize and updates
                await pinChatMessage(updatedEvent.telegramChatId, msgId, process.env.TELEGRAM_BOT_TOKEN);
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
