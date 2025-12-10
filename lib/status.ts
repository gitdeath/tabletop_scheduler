
export function generateStatusMessage(event: any, participantCount: number, baseUrl?: string) {
    let statusMsg = `📊 <b>${event.title}</b>\n\n`;
    statusMsg += `👥 <b>Participants:</b> ${participantCount}\n\n`;
    statusMsg += `<b>Current Votes:</b>\n`;

    event.timeSlots.forEach((slot: any) => {
        const yes = slot.votes.filter((v: any) => v.preference === 'YES').length;
        const maybe = slot.votes.filter((v: any) => v.preference === 'MAYBE').length;
        const dateStr = new Date(slot.startTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
        const timeStr = new Date(slot.startTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

        // Highlight perfect slots
        const isPerfect = yes >= event.minPlayers && yes === participantCount && participantCount > 0;
        const prefix = isPerfect ? "🌟 " : "▫️ ";

        statusMsg += `${prefix}<b>${dateStr} @ ${timeStr}</b>\n`;
        statusMsg += `   ✅ ${yes}  ⚠️ ${maybe}\n`;
    });

    // Use provided key, or env vars, or default
    const url = baseUrl || process.env.PUBLIC_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://tabletop-scheduler.com';
    statusMsg += `\n<a href="${url}/e/${event.slug}">🔗 Vote Here</a>`;
    return statusMsg;
}
