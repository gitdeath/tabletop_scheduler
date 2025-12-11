# Engineering Plan

## Epic 1: Manager View Stability Fixes
**Underlying Issues:** #12
**Status:** Skipped (Cannot Reproduce)

## Epic 2: Scheduler Algorithm Refinements
**Underlying Issues:** #17, #18
**Status:** Done
- [x] **Phase 1: Investigation**
    - [x] Analyze `app/e/[slug]/manage/page.tsx` for inline ranking logic.
    - [x] Verify `House` availability logic (check if data model supports it).
- [x] **Phase 2: Planning**
    - [x] Design ranking algorithm update:
        - "If Needed" (Maybe) counts for viability but lowers rank vs "Yes".
        - "No House Available" prevents "Perfect" status.
- [x] **Phase 3: Implementation**
    - [x] Update `app/e/[slug]/manage/page.tsx` ranking logic.
    - [x] Update Voting UI tooltips if needed.
- [x] **Phase 4: Commit**
    - [x] Commit changes with message: "feat: Scheduler Algorithm Refinements - fixes #17, #18"
    - [x] Mark Epic as Done.

## Epic 3: Event Finalization & Logistics
**Underlying Issues:** #13, #14
**Status:** Done
- [x] **Phase 1: Investigation**
    - [x] Review `House` selection UI in Manager Finalization flow.
    - [x] Review Calendar link generation code.
- [x] **Phase 2: Planning**
    - [x] Design UI for "Select House" and "Add Address" during finalization (Issue #14).
    - [x] Design "Google Calendar" link generation (Issue #13).
    - [x] Identify potential breaking changes.
- [x] **Phase 3: Implementation**
    - [x] Update Manager Finalize form to include House/Address.
    - [x] Update Email/Telegram notifications with address.
    - [x] Implement Google Calendar URL generator.
    - [x] Verify fixes against issue requirements.
- [x] **Phase 4: Commit**
    - [x] Commit changes with message: "feat: Event Finalization & Logistics - fixes #13, #14"
    - [x] Mark Epic as Done.
