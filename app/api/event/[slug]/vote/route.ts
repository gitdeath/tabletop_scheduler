import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(
    req: Request,
    { params }: { params: { slug: string } } // slug is actually eventId in route path /api/event/[id]/vote but we need to match folder structure
) {
    try {
        const eventId = parseInt(params.slug); // Since file is in /api/event/[slug]/vote, params.slug is the ID
        const body = await req.json();
        const { name, telegramId, votes, participantId } = body;

        if (!name || !votes || !Array.isArray(votes)) {
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

        return NextResponse.json({ success: true, participantId: result.id });
    } catch (error) {
        console.error("Vote failed:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
