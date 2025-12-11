# Engineering Plan

## Epic 1: Fix Telegram Integration Bugs
**Underlying Issues:** #20 (Timezone), #21 (Calendar Link/Icon)
**Status:** Done
- [x] **Phase 1: Investigation**
    - [x] Analyze codebase for relevant files (`lib/telegram-poller.ts`, `lib/telegram.ts`, `app/api/telegram/`).
    - [x] Summarize findings and verify reproduction steps for bugs:
        - Verify how timezone is currently handled in Telegram messages (Issue #20: "Telegram time is showing the wrong time (UTC, not the time of the users)").
        - Verify how calendar links are generated and why they might be stale or missing the correct icon (Issue #21: "When the location of the event is update the calendar link posted by telegram isn't updated" and "G for google isn't the icon it is just a G").
- [x] **Phase 2: Planning**
    - [x] Write a pseudo-code implementation plan - include in plain English how each user story is resolved.
    - [x] Identify potential breaking changes (e.g., changes to database schema for timezone storage).
- [x] **Phase 3: Implementation**
    - [x] Write the code to resolve issues.
    - [x] Verify fixes against issue requirements:
        - Ensure Telegram message shows user's local time.
        - Ensure calendar link updates when location changes.
        - Ensure Google Calendar icon is correct.
    - [x] Update documentation within the project that is impacted by the change.
- [x] **Phase 4: Commit**
    - [x] Commit changes with message: "fix: Fix Telegram Integration Bugs - fixes #20, fixes #21"
    - [x] Mark Epic as Done.

## Epic 2: Event Finalization Improvements
**Underlying Issues:** #19 (Auto-select single option)
**Status:** Done
- [x] **Phase 1: Investigation**
    - [x] Analyze codebase for relevant files (`app/e/[slug]/manage/FinalizeEventModal.tsx`).
    - [x] Summarize findings on current selection logic.
- [x] **Phase 2: Planning**
    - [x] Write a pseudo-code implementation plan - explain how to detect if only one option exists and select it automatically (Issue #19: "On Finalize Event if only one option it should be selected").
    - [x] Identify potential breaking changes.
- [x] **Phase 3: Implementation**
    - [x] Write the code to resolve issues.
    - [x] Verify fixes against issue requirements.
    - [x] Update documentation within the project that is impacted by the change.
- [x] **Phase 4: Commit**
    - [x] Commit changes with message: "feat: Event Finalization Improvements - fixes #19"
    - [x] Mark Epic as Done.

## Epic 3: Event Description in Calendar Invite
**Underlying Issues:** #22 (Event description missing from calendar)
**Status:** Pending
- [x] **Phase 1: Investigation**
    - [x] Analyze `app/api/event/[slug]/ics/route.ts` (ICS generation).
    - [x] Analyze `lib/eventMessage.ts` (Google Calendar link generation).
    - [x] Determine if description is currently passed from the database to these generators.
    - Result: `lib/eventMessage.ts` overwrites description. `ics/route.ts` uses raw description but misses host info.
- [ ] **Phase 2: Planning**
    - [x] Plan code changes to ensure `event.description` is fetched and passed to calendar generators.
- [ ] **Phase 3: Implementation**
    - [ ] Update ICS route to include Description + Host + Link.
    - [ ] Update Google Calendar link builder to include Description + Host + Link.
    - [ ] Verification.
- [ ] **Phase 4: Commit**
    - [ ] Commit changes with message: "fix: Include event description in calendar invites - fixes #22"
