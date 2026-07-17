# EasyEPS QA Notes

## Home page — 2026-07-17

The development application loaded successfully at `http://localhost:3000/`. The first capture occurred before complete visual hydration and appeared blank, but the immediate second capture rendered correctly. The verified desktop home page includes the cream, navy, and gold design system; sticky navigation; Bengali hero copy; learner progress card; curriculum statistics; feature cards; selected lessons section; call to action; and footer. Bengali and Korean text render legibly, spacing is consistent, and no visible overflow appeared at the 896-pixel browser viewport.

The public curriculum API initially returned no featured cards in the text snapshot before hydration; this will be checked again through the curriculum and lesson routes. Authentication reports an expected missing local OAuth configuration in development, so signed-in-only pages will be validated for their unauthenticated gates while protected API behavior remains covered through type checking and server contracts.

## Curriculum route — initial defect

The `/curriculum` layout and controls render correctly, but the lesson query remained in its loading state across two captures. This indicates a server-side curriculum endpoint failure or a request that never resolves, rather than a visual rendering issue. The next QA step is to inspect server output and call the endpoint directly before retesting.

## Curriculum and generated lesson — repaired and verified

After repairing legacy practice records, the public curriculum endpoint returned HTTP 200 with 60 lesson summaries. The `/curriculum` page now renders all chapters 1–60, accurate category labels, search/filter controls, chapter titles in Bengali and Korean, vocabulary counts, practice counts, and local completion state. The card grid is visually consistent without desktop overflow.

The newly generated `/lesson/31` route also renders successfully. The lesson player shows the workplace category, Bengali and Korean titles, 18 vocabulary items, three grammar points, ten practice items, eight exam questions, five learning sections, progress navigation, and adjacent chapter links. The visual hierarchy and Bengali/Korean typography are correct.

## Lesson vocabulary interactions

Chapter 31 section navigation opens the vocabulary list with all 18 words, Korean terms, transliterations, Bengali and English meanings, Korean examples, Bengali translations, and per-item speech controls. Flashcard mode switches correctly to a focused 1-of-18 card with reveal, pronunciation, previous, next, and return-to-list controls. Both layouts are responsive and accessible to guest learners.
