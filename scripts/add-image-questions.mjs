#!/usr/bin/env node
/**
 * One-time content migration: add representative image-based EPS questions
 * (pictures / safety signs, like the real EPS-TOPIK exam) to selected chapters.
 *
 * - Idempotent: skips a chapter if the question id already exists.
 * - Keeps every lesson within schema bounds (epsQuestions max 20).
 * - Images live in client/public/eps-images/*.svg (original, license-free art).
 *
 * Run: node scripts/add-image-questions.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lessonDir = path.join(root, "content", "lessons");

/** New image-based questions keyed by chapter. */
const additions = {
  21: [
    {
      id: "e-img-1",
      section: "reading",
      questionBn: "ছবির চিহ্নটি দেখে সঠিক অর্থ নির্বাচন করুন।",
      questionKo: "다음 그림을 보고 알맞은 것을 고르십시오.",
      passage: "",
      image: {
        src: "/eps-images/sign-wet-floor.svg",
        altBn: "হলুদ ত্রিভুজ সতর্কতা চিহ্ন — একজন ব্যক্তি ভেজা মেঝেতে পিছলে পড়ছে, নিচে লেখা 미끄럼 주의",
        altKo: "미끄럼 주의 표지",
        captionBn: "দোকান বা ভবনের মেঝেতে এই চিহ্ন দেখা যায়।",
        kind: "safety-sign",
      },
      options: ["바닥이 미끄러우니 조심하라는 뜻이다.", "바닥에서 뛰어도 된다는 뜻이다.", "청소를 하지 말라는 뜻이다.", "신발을 벗으라는 뜻이다."],
      answer: 0,
      explanationBn: "미끄럼 주의 মানে মেঝে পিচ্ছিল — সাবধানে চলুন। তাই বিকল্প ১ সঠিক।",
    },
  ],
  53: [
    {
      id: "e-img-1",
      section: "reading",
      questionBn: "ছবির নিরাপত্তা চিহ্নটির অর্থ কী?",
      questionKo: "다음 안전 표지의 의미로 알맞은 것을 고르십시오.",
      passage: "",
      image: {
        src: "/eps-images/sign-no-entry.svg",
        altBn: "লাল বৃত্তের ভেতরে অনুভূমিক লাল দণ্ড — প্রবেশ নিষেধ চিহ্ন, নিচে লেখা 출입금지",
        altKo: "출입금지 표지",
        captionBn: "কারখানার বিপজ্জনক এলাকার প্রবেশপথে এই চিহ্ন থাকে।",
        kind: "safety-sign",
      },
      options: ["이 곳에 들어가면 안 된다.", "이 곳에서 쉬어도 된다.", "이 곳은 비상구이다.", "이 곳에서 담배를 피워도 된다."],
      answer: 0,
      explanationBn: "출입금지 মানে প্রবেশ নিষেধ — ভেতরে ঢোকা যাবে না। তাই বিকল্প ১ সঠিক।",
    },
    {
      id: "e-img-2",
      section: "reading",
      questionBn: "ছবির চিহ্নটি কোথায় দেখা যায় এবং এর অর্থ কী?",
      questionKo: "다음 표지를 보고 알맞은 것을 고르십시오.",
      passage: "",
      image: {
        src: "/eps-images/sign-electric-hazard.svg",
        altBn: "হলুদ ত্রিভুজের ভেতরে কালো বজ্র চিহ্ন — বৈদ্যুতিক শক সতর্কতা, নিচে লেখা 감전 주의",
        altKo: "감전 주의 표지",
        captionBn: "উচ্চ ভোল্টেজ যন্ত্রপাতির কাছে এই চিহ্ন থাকে।",
        kind: "safety-sign",
      },
      options: ["감전 위험이 있으니 조심해야 한다.", "물을 마셔도 된다는 뜻이다.", "전기가 없다는 뜻이다.", "누구나 만져도 안전하다는 뜻이다."],
      answer: 0,
      explanationBn: "감전 주의 মানে বৈদ্যুতিক শকের ঝুঁকি আছে — সাবধান থাকতে হবে। তাই বিকল্প ১ সঠিক।",
    },
    {
      id: "e-img-3",
      section: "reading",
      questionBn: "ছবিতে দেখানো চিহ্ন অনুযায়ী কর্মীদের কী করতে হবে?",
      questionKo: "다음 표지를 보고 근로자가 해야 할 일을 고르십시오.",
      passage: "",
      image: {
        src: "/eps-images/sign-hard-hat.svg",
        altBn: "নীল বৃত্তের ভেতরে সাদা নিরাপত্তা হেলমেট — বাধ্যতামূলক নির্দেশ চিহ্ন, নিচে লেখা 안전모 착용",
        altKo: "안전모 착용 표지",
        captionBn: "নির্মাণস্থল ও কারখানার প্রবেশপথে এই চিহ্ন থাকে।",
        kind: "safety-sign",
      },
      options: ["안전모를 반드시 써야 한다.", "안전모를 벗어야 한다.", "장갑을 껴야 한다.", "귀마개를 껴야 한다."],
      answer: 0,
      explanationBn: "নীল বৃত্তের চিহ্ন মানে বাধ্যতামূলক নির্দেশ — এখানে 안전모 (হেলমেট) পরতেই হবে। বিকল্প ১ সঠিক।",
    },
    {
      id: "e-img-4",
      section: "listening",
      questionBn: "ছবিটি দেখুন, তারপর অডিও শুনে সঠিক উত্তর দিন।",
      questionKo: "그림을 보고 대화를 들은 후 알맞은 것을 고르십시오.",
      passage: "남자: 여기 왜 금연 표지가 붙어 있어요? 여자: 공장 안에는 기름이 많아서 담배를 피우면 큰불이 날 수 있어요.",
      image: {
        src: "/eps-images/sign-no-smoking.svg",
        altBn: "লাল বৃত্তের ভেতরে জ্বলন্ত সিগারেটের ওপর লাল তির্যক রেখা — ধূমপান নিষেধ চিহ্ন, নিচে লেখা 금연",
        altKo: "금연 표지",
        captionBn: "",
        kind: "safety-sign",
      },
      options: ["공장 안에서 담배를 피우면 안 된다.", "공장 안에서 담배를 피워도 된다.", "표지는 비상구를 알려 준다.", "여자는 담배를 피우고 있다."],
      answer: 0,
      explanationBn: "금연 চিহ্ন ও সংলাপ দুটোই বলছে কারখানার ভেতরে ধূমপান নিষেধ — আগুনের ঝুঁকি আছে। বিকল্প ১ সঠিক।",
    },
  ],
  54: [
    {
      id: "e-img-1",
      section: "reading",
      questionBn: "ছবির চিহ্নটি দেখে সঠিক নিয়মটি নির্বাচন করুন।",
      questionKo: "다음 표지를 보고 알맞은 규칙을 고르십시오.",
      passage: "",
      image: {
        src: "/eps-images/sign-forklift.svg",
        altBn: "হলুদ ত্রিভুজের ভেতরে কালো ফর্কলিফট — ফর্কলিফট চলাচল সতর্কতা চিহ্ন, নিচে লেখা 지게차 주의",
        altKo: "지게차 주의 표지",
        captionBn: "গুদাম ও কারখানার করিডোরে এই চিহ্ন থাকে।",
        kind: "safety-sign",
      },
      options: ["지게차가 다니니까 주위를 잘 살펴야 한다.", "지게차 위에 올라타도 된다.", "이 길은 지게차만 다닐 수 있다.", "지게차보다 빨리 뛰어야 한다."],
      answer: 0,
      explanationBn: "지게차 주의 মানে ফর্কলিফট চলাচল করে — চারপাশ দেখে সাবধানে চলতে হবে। বিকল্প ১ সঠিক।",
    },
    {
      id: "e-img-2",
      section: "reading",
      questionBn: "ছবির চিহ্নটি কী নির্দেশ করে?",
      questionKo: "다음 표지가 나타내는 것을 고르십시오.",
      passage: "",
      image: {
        src: "/eps-images/sign-emergency-exit.svg",
        altBn: "সবুজ আয়তক্ষেত্রে দরজার দিকে দৌড়ানো মানুষের সাদা প্রতীক — জরুরি বহির্গমন চিহ্ন, নিচে লেখা 비상구",
        altKo: "비상구 표지",
        captionBn: "আগুন বা দুর্ঘটনার সময় এই পথে বের হতে হয়।",
        kind: "safety-sign",
      },
      options: ["위험할 때 밖으로 나가는 문이다.", "화장실 위치를 알려 준다.", "출입을 금지하는 표지이다.", "식당으로 가는 길이다."],
      answer: 0,
      explanationBn: "비상구 মানে জরুরি বহির্গমন পথ — বিপদের সময় এ পথে বাইরে যেতে হয়। বিকল্প ১ সঠিক।",
    },
  ],
  55: [
    {
      id: "e-img-1",
      section: "reading",
      questionBn: "ছবির চিহ্ন অনুযায়ী এই কর্মক্ষেত্রে কোন সুরক্ষা সরঞ্জাম পরতে হবে?",
      questionKo: "다음 표지를 보고 착용해야 하는 보호구를 고르십시오.",
      passage: "",
      image: {
        src: "/eps-images/sign-ear-protection.svg",
        altBn: "নীল বৃত্তের ভেতরে সাদা কানসুরক্ষা (ইয়ারমাফ) প্রতীক — বাধ্যতামূলক চিহ্ন, নিচে লেখা 귀마개 착용",
        altKo: "귀마개 착용 표지",
        captionBn: "উচ্চ শব্দের যন্ত্রের কাছে এই চিহ্ন থাকে।",
        kind: "safety-sign",
      },
      options: ["귀마개", "안전화", "안전모", "마스크"],
      answer: 0,
      explanationBn: "চিহ্নে 귀마개 착용 লেখা — অর্থাৎ কানসুরক্ষা পরা বাধ্যতামূলক। বিকল্প ১ সঠিক।",
    },
    {
      id: "e-img-2",
      section: "reading",
      questionBn: "ছবির চিহ্নটির নির্দেশনা কী?",
      questionKo: "다음 표지의 지시로 알맞은 것을 고르십시오.",
      passage: "",
      image: {
        src: "/eps-images/sign-safety-gloves.svg",
        altBn: "নীল বৃত্তের ভেতরে সাদা হাতমোজা প্রতীক — বাধ্যতামূলক চিহ্ন, নিচে লেখা 안전장갑 착용",
        altKo: "안전장갑 착용 표지",
        captionBn: "",
        kind: "safety-sign",
      },
      options: ["안전장갑을 껴야 한다.", "맨손으로 일해야 한다.", "장갑을 벗어야 한다.", "안전화를 신어야 한다."],
      answer: 0,
      explanationBn: "안전장갑 착용 মানে নিরাপত্তা হাতমোজা পরতেই হবে। বিকল্প ১ সঠিক।",
    },
  ],
  56: [
    {
      id: "e-img-1",
      section: "reading",
      questionBn: "ছবির চিহ্নটি কোন স্থান নির্দেশ করে?",
      questionKo: "다음 표지가 나타내는 장소를 고르십시오.",
      passage: "",
      image: {
        src: "/eps-images/sign-first-aid.svg",
        altBn: "সবুজ আয়তক্ষেত্রে সাদা প্লাস (ক্রস) প্রতীক — প্রাথমিক চিকিৎসা কেন্দ্র চিহ্ন, নিচে লেখা 응급처치",
        altKo: "응급처치 표지",
        captionBn: "আহত হলে এই স্থানে প্রাথমিক চিকিৎসা নেওয়া যায়।",
        kind: "safety-sign",
      },
      options: ["응급처치를 받을 수 있는 곳", "담배를 피우는 곳", "지게차를 세우는 곳", "밥을 먹는 곳"],
      answer: 0,
      explanationBn: "সবুজ ক্রস চিহ্ন মানে প্রাথমিক চিকিৎসা কেন্দ্র (응급처치)। বিকল্প ১ সঠিক।",
    },
    {
      id: "e-img-2",
      section: "listening",
      questionBn: "ছবিটি দেখুন, তারপর অডিও শুনে সঠিক উত্তর দিন।",
      questionKo: "그림을 보고 대화를 들은 후 알맞은 것을 고르십시오.",
      passage: "여자: 손을 다쳤어요! 남자: 저기 소화기 옆에 있는 응급처치함에서 붕대를 가져올게요. 잠깐만 기다리세요.",
      image: {
        src: "/eps-images/sign-fire-extinguisher.svg",
        altBn: "লাল আয়তক্ষেত্রে সাদা অগ্নিনির্বাপক যন্ত্রের প্রতীক — অগ্নিনির্বাপক অবস্থান চিহ্ন, নিচে লেখা 소화기",
        altKo: "소화기 표지",
        captionBn: "",
        kind: "safety-sign",
      },
      options: ["남자는 응급처치함에서 붕대를 가져올 것이다.", "여자는 불을 끄고 있다.", "남자는 병원에 전화했다.", "여자는 소화기를 사용했다."],
      answer: 0,
      explanationBn: "সংলাপে পুরুষ বলেছে অগ্নিনির্বাপকের পাশে থাকা প্রাথমিক চিকিৎসা বাক্স থেকে ব্যান্ডেজ আনবে। বিকল্প ১ সঠিক।",
    },
  ],
};

let changed = 0;
for (const [chapterKey, questions] of Object.entries(additions)) {
  const chapter = Number(chapterKey);
  const file = path.join(lessonDir, `lesson-${String(chapter).padStart(2, "0")}.json`);
  const lesson = JSON.parse(fs.readFileSync(file, "utf8"));
  const existing = new Set(lesson.epsQuestions.map(question => question.id));
  let added = 0;
  for (const question of questions) {
    if (existing.has(question.id)) continue;
    if (lesson.epsQuestions.length >= 20) {
      console.warn(`chapter ${chapter}: at max epsQuestions (20), skipping ${question.id}`);
      continue;
    }
    lesson.epsQuestions.push(question);
    added += 1;
  }
  if (added > 0) {
    fs.writeFileSync(file, `${JSON.stringify(lesson, null, 2)}\n`, "utf8");
    console.log(`chapter ${chapter}: added ${added} image question(s), total eps = ${lesson.epsQuestions.length}`);
    changed += 1;
  } else {
    console.log(`chapter ${chapter}: nothing to add (already present)`);
  }
}
console.log(changed > 0 ? "Done." : "No changes.");
