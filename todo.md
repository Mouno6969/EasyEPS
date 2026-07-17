# EasyEPS Project TODO

## Foundation
- [ ] Define lesson JSON schema (vocabulary, grammar, dialogues, practice, EPS questions)
- [ ] Database schema: lessons, progress, quiz attempts, mock tests, planner, badges, certificates
- [ ] Sacred geometry design system (cream bg, golden line art, navy headlines, gold accents)
- [ ] Trilingual i18n system (Bangla default, Korean, English)

## Curriculum Content
- [ ] Author all 60 lesson JSON files (vocab w/ Bengali translations, grammar notes, dialogues, 10+ practice Qs, 8+ EPS Qs each)
- [ ] Validate all 60 lessons against schema
- [ ] Seed lessons into database
- [ ] Maintain content/manifest.json recording completed chapters (resumability)
- [ ] Push completed lesson batches to GitHub incrementally (batch 1: 1-15, batch 2: 16-30, batch 3: 31-45, batch 4: 46-60)
- [ ] CONTINUATION.md with resume instructions for future sessions

## Core Learning Experience
- [ ] Landing page with sacred geometry aesthetic
- [ ] Curriculum overview page (60 chapters, categorized)
- [ ] Lesson detail page: vocabulary section with Bengali translations and example sentences
- [ ] Vocabulary flashcards (flip interaction)
- [ ] Korean TTS pronunciation (dynamic synthesis, no pre-recorded files)
- [ ] Structured dialogues with per-line audio
- [ ] Grammar notes section
- [ ] Practice activities: fill-in-the-blank, matching, multiple-choice (10+ per chapter)

## Exam Tools
- [ ] Chapter mock exams (8+ EPS-TOPIK style questions, timed, score report)
- [ ] Full-length mock tests drawing from all 60 chapters
- [ ] Countdown timer, scoring engine, detailed result breakdown

## Personalization
- [ ] Progress tracking: per-lesson completion, quiz scores, streaks, dashboard
- [ ] Study planner: daily goals, scheduled lessons, weekly calendar
- [ ] User profiles: learning history, badges
- [ ] Downloadable completion certificates
- [ ] AI chat assistant (Bengali explanations, pronunciation guidance)

## Admin
- [ ] Role-gated admin panel (separate from learner UI)
- [ ] Content management: edit lessons, questions
- [ ] User management and stats

## Quality & Delivery
- [ ] Vitest tests for server procedures
- [ ] Browser verification of key flows
- [ ] Responsive mobile layout
- [ ] Save checkpoint
- [ ] Push to GitHub repo Mouno6969/EasyEPS with continuation instructions
