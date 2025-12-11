
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Epic 3 test data...');

    // Cleanup
    await prisma.vote.deleteMany({ where: { timeSlot: { event: { slug: 'loc-test' } } } });
    await prisma.participant.deleteMany({ where: { event: { slug: 'loc-test' } } });
    await prisma.timeSlot.deleteMany({ where: { event: { slug: 'loc-test' } } });
    await prisma.event.deleteMany({ where: { slug: 'loc-test' } });

    // Create Event
    const event = await prisma.event.create({
        data: {
            slug: 'loc-test',
            title: 'Location Test Game',
            minPlayers: 3,
            managerTelegram: '@tester',
        },
    });

    // Create Slot
    const slot = await prisma.timeSlot.create({
        data: {
            eventId: event.id,
            startTime: new Date(Date.now() + 86400000), // Tomorrow
            endTime: new Date(Date.now() + 90000000),
        },
    });

    console.log(`Seeded event: loc-test (ID: ${event.id}), Slot ID: ${slot.id}`);
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
