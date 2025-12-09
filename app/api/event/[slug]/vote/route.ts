import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(
    req: Request,
    { params }: { params: { slug: string } } // slug is actually eventId in route path /api/event/[id]/vote but we need to match folder structure
) {
    try {
        const eventId = parseInt(params.slug); // Since file is in /api/event/[slug]/vote, params.slug is the ID
        const body = await req.json();
        const { name, telegramId, votes } = body;

        if (!name || !votes || !Array.isArray(votes)) {
            return NextResponse.json({ error: "Invalid data" }, { status: 400 });
        }

        // Use a transaction to ensure participant exists and votes are recorded
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create or find participant
            // Simple logic: we don't have auth, so we create a new participant every time? 
            // User Story says "No-Login". 
            // To allow editing, we might need a cookie or something, but for MVP let's just create new.
            // Wait, duplication is bad. Let's try to match by name+eventId for now (primitive)
            // or just create new.

            const participant = await tx.participant.create({
                data: {
                    eventId,
                    name,
                    telegramId,
                },
            });

            // 2. Create votes
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
