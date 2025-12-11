
/**
 * Generates a real-time status dashboard for an event.
 * Shows participant counts and a breakdown of votes per slot.
 * 
 * @param event - The event object with timeSlots and votes.
 * @param participantCount - Total distinct participants.
 * @param baseUrl - (Optional) Base URL for the voting link.
 */
export function generateStatusMessage(event: any, participantCount: number, baseUrl?: string) {
    let statusMsg = `📊 <b>${event.title}</b>\n\n`;
    statusMsg += `👥 <b>Participants:</b> ${participantCount}\n\n`;
    statusMsg += `<b>Current Votes:</b>\n`;

    event.timeSlots.forEach((slot: any) => {
        const yes = slot.votes.filter((v: any) => v.preference === 'YES').length;
        const maybe = slot.votes.filter((v: any) => v.preference === 'MAYBE').length;

        const tz = event.timezone || 'UTC';
        const dateStr = new Date(slot.startTime).toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric', timeZone: tz
        });
        const timeStr = new Date(slot.startTime).toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit', timeZone: tz, timeZoneName: 'short'
        });

        // A "Perfect" slot meets the quota AND has 100% attendance from current participants.
        const isPerfect = yes >= event.minPlayers && yes === participantCount && participantCount > 0;
        const prefix = isPerfect ? "🌟 " : "▫️ ";

        statusMsg += `${prefix}<b>${dateStr} @ ${timeStr}</b>\n`;
        statusMsg += `   ✅ ${yes}  ⚠️ ${maybe}\n`;
    });

    // Use provided key or default to localhost if missing (though caller should provide it)
    const url = baseUrl || 'http://localhost:3000';
    statusMsg += `\n<a href="${url}/e/${event.slug}">🔗 Vote Here</a>`;
    return statusMsg;
}
