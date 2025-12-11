# Engineering Plan

## Epic 1: Fix Telegram Integration Bugs
**Underlying Issues:** #20 (Timezone), #21 (Calendar Link/Icon)
**Status:** Pending
- [ ] **Phase 1: Investigation**
    - [ ] Analyze codebase for relevant files (`lib/telegram-poller.ts`, `lib/telegram.ts`, `app/api/telegram/`).
    - [ ] Summarize findings and verify reproduction steps for bugs:
        - Verify how timezone is currently handled in Telegram messages (Issue #20: "Telegram time is showing the wrong time (UTC, not the time of the users)").
        - Verify how calendar links are generated and why they might be stale or missing the correct icon (Issue #21: "When the location of the event is update the calendar link posted by telegram isn't updated" and "G for google isn't the icon it is just a G").
- [ ] **Phase 2: Planning**
    - [ ] Write a pseudo-code implementation plan - include in plain English how each user story is resolved.
    - [ ] Identify potential breaking changes (e.g., changes to database schema for timezone storage).
- [ ] **Phase 3: Implementation**
    - [ ] Write the code to resolve issues.
    - [ ] Verify fixes against issue requirements:
        - Ensure Telegram message shows user's local time.
        - Ensure calendar link updates when location changes.
        - Ensure Google Calendar icon is correct.
    - [ ] Update documentation within the project that is impacted by the change.
- [ ] **Phase 4: Commit**
    - [ ] Commit changes with message: "fix: Fix Telegram Integration Bugs - fixes #20, fixes #21"
    - [ ] Mark Epic as Done.

## Epic 2: Event Finalization Improvements
**Underlying Issues:** #19 (Auto-select single option)
**Status:** Pending
- [ ] **Phase 1: Investigation**
    - [ ] Analyze codebase for relevant files (`app/e/[slug]/manage/FinalizeEventModal.tsx`).
    - [ ] Summarize findings on current selection logic.
- [ ] **Phase 2: Planning**
    - [ ] Write a pseudo-code implementation plan - explain how to detect if only one option exists and select it automatically (Issue #19: "On Finalize Event if only one option it should be selected").
    - [ ] Identify potential breaking changes.
- [ ] **Phase 3: Implementation**
    - [ ] Write the code to resolve issues.
    - [ ] Verify fixes against issue requirements.
    - [ ] Update documentation within the project that is impacted by the change.
- [ ] **Phase 4: Commit**
    - [ ] Commit changes with message: "feat: Event Finalization Improvements - fixes #19"
    - [ ] Mark Epic as Done.
