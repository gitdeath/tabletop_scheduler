# Engineering Plan

## Epic 1: Manager View Stability Fixes
**Underlying Issues:** #12
**Status:** Done (Cannot Reproduce)
- [x] **Phase 1: Investigation**
    - [x] Analyze `app/e/[slug]/manage/page.tsx` (or similar) to identify why the page scrolls to the bottom on load.
    - [x] Verify reproduction steps (Load manager page in Chrome).
- [ ] **Phase 2: Planning** (Skipped)
- [ ] **Phase 3: Implementation** (Skipped)
- [x] **Phase 4: Commit**
    - [x] Mark Epic as Done.

## Epic 2: Scheduler Algorithm Refinements
**Underlying Issues:** #17, #18
**Status:** In Progress
- [x] **Phase 1: Investigation**
    - [x] Analyze `lib/algorithm.ts` (or equivalent) to understand current "Perfect" vs "Valid" slot logic.
    - [x] Analyze `House` model in `prisma/schema.prisma`.
- [x] **Phase 2: Planning**
    - [x] Write a pseudo-code implementation plan for updating the ranking logic.
        - "If Needed" counts as Yes for minimums but lowers rank.
        - "No House Available" lowers rank/removes "Perfect" status.
    - [x] Identify potential breaking changes (Ranking algorithm changes affecting existing proposed slots).
- [ ] **Phase 3: Implementation**
    - [ ] Update voting logic components/tooltips (Issue #17).
    - [ ] Update backend ranking algorithm (Issue #18).
    - [ ] Verify fixes against issue requirements.
- [ ] **Phase 4: Commit**
    - [ ] Commit changes with message: "feat: Scheduler Algorithm Refinements - fixes #17, #18"
    - [ ] Mark Epic as Done.

## Epic 3: Event Finalization & Logistics
**Underlying Issues:** #13, #14
**Status:** Pending
- [ ] **Phase 1: Investigation**
    - [ ] Review `House` selection UI in Manager Finalization flow.
    - [ ] Review Calendar link generation code (currently likely just `.ics`).
- [ ] **Phase 2: Planning**
    - [ ] Design UI for "Select House" and "Add Address" during finalization (Issue #14).
    - [ ] Design "Google Calendar" link generation (Issue #13).
    - [ ] Identify potential breaking changes.
- [ ] **Phase 3: Implementation**
    - [ ] Update Manager Finalize form to include House/Address.
    - [ ] Update Email/Telegram notifications with address.
    - [ ] Implement Google Calendar URL generator.
    - [ ] Verify fixes against issue requirements.
- [ ] **Phase 4: Commit**
    - [ ] Commit changes with message: "feat: Event Finalization & Logistics - fixes #13, #14"
    - [ ] Mark Epic as Done.

## Epic 4: Documentation & Hygiene
**Underlying Issues:** #15
**Status:** Pending
- [ ] **Phase 1: Investigation**
    - [ ] Audit `README.md` and `TELEGRAM_SETUP.md` for outdated info.
- [ ] **Phase 2: Planning**
    - [ ] List sections needing updates.
- [ ] **Phase 3: Implementation**
    - [ ] Rewrite outdated documentation.
    - [ ] Verify fixes against issue requirements.
- [ ] **Phase 4: Commit**
    - [ ] Commit changes with message: "docs: Documentation & Hygiene - fixes #15"
    - [ ] Mark Epic as Done.
