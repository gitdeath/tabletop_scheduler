const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const slug = 'algo-test';

    // Cleanup
    try {
        await prisma.event.delete({ where: { slug } });
        console.log('Deleted existing event');
    } catch (e) { }

    // Create Event with 3 min players
    const event = await prisma.event.create({
        data: {
            slug,
            title: 'Algorithm Test Event',
            minPlayers: 3,
            adminToken: 'admin-algo',
        },
    });

    // Create Participants
    const p1 = await prisma.participant.create({ data: { eventId: event.id, name: 'Alice' } });
    const p2 = await prisma.participant.create({ data: { eventId: event.id, name: 'Bob' } });
    const p3 = await prisma.participant.create({ data: { eventId: event.id, name: 'Charlie' } });

    // Create Time Slots with Votes
    const baseTime = new Date().getTime();

    // Slot 1: 3 Yes, NO Host. (Score: Viable, No Host) -> Rank 3rd or 4th depending on 'Viable+NoHost' vs 'NotViable'
    await createSlotWithVotes(event.id, baseTime, [
        { pid: p1.id, pref: 'YES', host: false },
        { pid: p2.id, pref: 'YES', host: false },
        { pid: p3.id, pref: 'YES', host: false },
    ]);

    // Slot 2: 3 Yes, 1 Host. (Score: Perfect) -> Rank 1st
    await createSlotWithVotes(event.id, baseTime + 3600000, [
        { pid: p1.id, pref: 'YES', host: true },
        { pid: p2.id, pref: 'YES', host: false },
        { pid: p3.id, pref: 'YES', host: false },
    ]);

    // Slot 3: 2 Yes, 1 Maybe, 1 Host. (Score: Viable, Host) -> Rank 2nd
    await createSlotWithVotes(event.id, baseTime + 7200000, [
        { pid: p1.id, pref: 'YES', host: true },
        { pid: p2.id, pref: 'YES', host: false },
        { pid: p3.id, pref: 'MAYBE', host: false },
    ]);

    // Slot 4: 2 Yes, 1 Maybe, NO Host. (Score: Viable, No Host) -> Rank 4th (Tie with Slot 1 on viability, but less Yes votes)
    await createSlotWithVotes(event.id, baseTime + 10800000, [
        { pid: p1.id, pref: 'YES', host: false },
        { pid: p2.id, pref: 'YES', host: false },
        { pid: p3.id, pref: 'MAYBE', host: false },
    ]);

    console.log(`Created event: ${event.slug}`);
}

async function createSlotWithVotes(eventId, startTimeMs, votes) {
    const slot = await prisma.timeSlot.create({
        data: {
            eventId,
            startTime: new Date(startTimeMs),
            endTime: new Date(startTimeMs + 3600000),
        }
    });

    for (const v of votes) {
        await prisma.vote.create({
            data: {
                timeSlotId: slot.id,
                participantId: v.pid,
                preference: v.pref,
                canHost: v.host
            }
        });
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
