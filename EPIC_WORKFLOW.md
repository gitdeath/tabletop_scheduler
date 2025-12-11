# Engineering Plan

## Epic 1: Manager View Stability Fixes
**Underlying Issues:** #12
**Status:** Skipped (Cannot Reproduce)

## Epic 2: Scheduler Algorithm Refinements
**Underlying Issues:** #17, #18
**Status:** In Progress
- [ ] **Phase 1: Investigation**
    - [ ] Analyze `app/e/[slug]/manage/page.tsx` for inline ranking logic.
    - [ ] Verify `House` availability logic (check if data model supports it).
- [ ] **Phase 2: Planning**
    - [ ] Design ranking algorithm update:
        - "If Needed" (Maybe) counts for viability but lowers rank vs "Yes".
        - "No House Available" prevents "Perfect" status.
- [ ] **Phase 3: Implementation**
    - [ ] Update `app/e/[slug]/manage/page.tsx` ranking logic.
    - [ ] Update Voting UI tooltips if needed.
- [ ] **Phase 4: Commit**
    - [ ] Commit changes with message: "feat: Scheduler Algorithm Refinements - fixes #17, #18"
    - [ ] Mark Epic as Done.

## Epic 3: Event Finalization & Logistics
**Underlying Issues:** #13, #14
**Status:** Pending
- [ ] **Phase 1: Investigation**
    - [ ] Review `House` selection UI in Manager Finalization flow.
    - [ ] Review Calendar link generation code.
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
