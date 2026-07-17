# EasyEPS Project TODO

## Foundation (from previous session, migrated into this project)
- [x] Define lesson JSON schema (vocabulary, grammar, dialogues, practice, EPS questions)
- [x] Database schema: lessons, progress, quiz attempts, mock tests, planner, badges, certificates
- [x] Sacred geometry design system (cream bg, golden line art, navy headlines, gold accents)
- [x] Trilingual i18n system (Bangla default, Korean, English)

## Curriculum Content
- [x] Author all 60 lesson JSON files (vocab w/ Bengali translations, grammar notes, dialogues, 10+ practice Qs, 8+ EPS Qs each)
- [x] Validate all 60 lessons against schema
- [x] Maintain content/manifest.json recording completed chapters (resumability)
- [x] CONTINUATION.md with resume instructions for future sessions

## Migration into webdev project (this session)
- [x] Copy app code (pages, components, contexts, lib, server, shared, drizzle, content) into /home/ubuntu/easyeps
- [x] Apply database schema migration (8 feature tables)
- [x] TypeScript check passes
- [x] Vitest suite passes
- [x] Production build succeeds
- [x] curriculum.list / get / mockTest endpoints verified via HTTP

## End-to-end verification (this session)
- [x] Landing page renders (hero, stats, featured chapters, progress card, CTA)
- [x] Curriculum page: search, filter, 60 chapters, completion state
- [x] Lesson page: vocabulary, flashcards, TTS controls, grammar, dialogues, practice
- [x] Chapter exam: timer, scoring, result breakdown (verified in prior session QA + endpoints)
- [x] Full mock test: config screen, timer, score report (config verified visually; 40-question generation verified via API and tests)
- [x] Dashboard: guest local-storage fallback and signed-in gate
- [x] Planner page renders and gates correctly
- [x] Tutor page renders with sign-in gate
- [x] Certificate verification route /certificate/:code publicly accessible
- [x] Admin panel role-gated (adminProcedure enforced; non-admin rejection covered by tests)
- [x] Mobile responsive check (375px viewport on home, curriculum, lesson)
- [x] Expand vitest coverage for key server procedures (9 tests passing)

## Delivery
- [x] Save checkpoint (version 4185483b)
- [ ] Push final state to GitHub Mouno6969/EasyEPS
- [ ] Deliver usage guidance to user
