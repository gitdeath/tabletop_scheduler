const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const slug = 'scroll-test';

    // Cleanup
    try {
        await prisma.event.delete({ where: { slug } });
        console.log('Deleted existing event');
    } catch (e) { }

    const event = await prisma.event.create({
        data: {
            slug,
            title: 'Scroll Test Event',
            adminToken: 'admin-123',
            timeSlots: {
                create: [
                    { startTime: new Date(), endTime: new Date(Date.now() + 3600000) },
                    { startTime: new Date(Date.now() + 86400000), endTime: new Date(Date.now() + 90000000) },
                ]
            }
        },
    });
    console.log(`Created event: ${event.slug}`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
