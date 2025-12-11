
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const event = await prisma.event.findUnique({
        where: { slug: 'loc-test' },
        include: { finalizedHouse: true },
    });

    if (!event) {
        console.error('Event not found');
        process.exit(1);
    }

    if (event.status !== 'FINALIZED') {
        console.error(`Event status matches: ${event.status}`);
    }

    if (event.finalizedHouse?.name === 'Test Casino' && event.finalizedHouse?.address === '777 Lucky Blvd') {
        console.log('SUCCESS: Event finalized with correct House.');
    } else {
        console.error('FAILURE: House data mismatch or missing.', event.finalizedHouse);
    }
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
