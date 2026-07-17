/** Canonical 60-chapter EPS-TOPIK curriculum list (standard textbook topics). */
export type ChapterCategory = "daily-life" | "culture" | "workplace" | "safety" | "laws";

export interface ChapterMeta {
  chapter: number;
  slug: string;
  ko: string;
  bn: string;
  en: string;
  category: ChapterCategory;
}

export const CATEGORY_LABELS: Record<ChapterCategory, { bn: string; en: string; ko: string }> = {
  "daily-life": { bn: "দৈনন্দিন জীবন", en: "Daily Life", ko: "일상생활" },
  culture: { bn: "কোরীয় সংস্কৃতি", en: "Korean Culture", ko: "한국 문화" },
  workplace: { bn: "কর্মক্ষেত্র", en: "Workplace", ko: "직장 생활" },
  safety: { bn: "শিল্প নিরাপত্তা", en: "Industrial Safety", ko: "산업 안전" },
  laws: { bn: "আইন ও বিধি", en: "Laws & Regulations", ko: "법률" },
};

const cat = (n: number): ChapterCategory =>
  n <= 24 ? "daily-life" : n <= 30 ? "culture" : n <= 52 ? "workplace" : n <= 56 ? "safety" : "laws";

const RAW: Array<[string, string, string]> = [
  ["자기소개", "নিজের পরিচয়", "Self Introduction"],
  ["일상생활에 필요한 물건", "দৈনন্দিন প্রয়োজনীয় জিনিস", "Daily Necessities"],
  ["장소와 위치", "অবস্থান ও স্থান", "Locations and Places"],
  ["행동과 사물", "কাজ ও বস্তু", "Actions and Objects"],
  ["날짜와 요일", "তারিখ ও সপ্তাহের দিন", "Dates and Days of the Week"],
  ["하루 일과", "দৈনন্দিন রুটিন", "Daily Routine"],
  ["계절과 날씨", "ঋতু ও আবহাওয়া", "Seasons and the Weather"],
  ["가족과 친구", "পরিবার ও বন্ধু", "Family and Friends"],
  ["음식 주문", "খাবার অর্ডার করা", "Ordering Food"],
  ["쇼핑", "কেনাকাটা", "Shopping"],
  ["집안일", "ঘরের কাজ", "Household Chores"],
  ["대중교통", "গণপরিবহন", "Public Transportation"],
  ["주말 활동", "সাপ্তাহিক ছুটির কার্যক্রম", "Weekend Activities"],
  ["길 찾기", "পথ জিজ্ঞাসা ও দিকনির্দেশ", "Getting Directions"],
  ["옷", "পোশাক", "Clothing"],
  ["집 구하기", "বাসা খোঁজা", "Finding a House"],
  ["휴가", "ছুটি ও ভ্রমণ", "Vacation"],
  ["취미", "শখ", "Hobbies"],
  ["요리", "রান্না", "Cooking"],
  ["인터넷과 스마트폰", "ইন্টারনেট ও স্মার্টফোন", "The Internet and Smartphones"],
  ["병원", "হাসপাতাল", "Hospital"],
  ["약국", "ফার্মেসি", "Pharmacy"],
  ["우체국", "ডাকঘর", "Post Office"],
  ["은행", "ব্যাংক", "Bank"],
  ["외국인력지원센터", "বিদেশি কর্মী সহায়তা কেন্দ্র", "Foreign Workers Support Center"],
  ["한국의 주거 문화와 음식 문화", "কোরিয়ার বাসস্থান ও খাদ্যসংস্কৃতি", "Korean Housing Culture and Food Culture"],
  ["한국의 기념일", "কোরিয়ার স্মরণীয় দিবস", "Korean Commemorative Days"],
  ["한국의 명절", "কোরিয়ার ঐতিহ্যবাহী উৎসব", "Korean Traditional Holidays"],
  ["한국의 예절", "কোরীয় শিষ্টাচার", "Korean Etiquette"],
  ["한국의 대중문화", "কোরিয়ার জনপ্রিয় সংস্কৃতি", "Korean Popular Culture"],
  ["복장과 근무 태도", "কর্মস্থলের পোশাক ও কাজের মনোভাব", "Attire and Work Attitude"],
  ["회사 시설 이용", "কোম্পানির সুবিধা ব্যবহার", "Use of Company Facilities"],
  ["동료 관계", "সহকর্মীর সঙ্গে সম্পর্ক", "Colleague Relationships"],
  ["성희롱과 성폭력 예방", "যৌন হয়রানি ও সহিংসতা প্রতিরোধ", "Sexual Harassment and Assault Prevention"],
  ["작업장 관리", "কর্মস্থল ব্যবস্থাপনা", "Workplace Management"],
  ["출하 관리", "প্যাকিং, লোডিং ও চালান ব্যবস্থাপনা", "Shipment Management"],
  ["기계 가공", "মেশিন চালনা ও প্রক্রিয়াকরণ", "Machine Processing"],
  ["기계 조립", "মেশিন সংযোজন ও বিচ্ছিন্নকরণ", "Machine Assembly"],
  ["금속 가공", "ধাতু প্রক্রিয়াকরণ, কাটিং ও ওয়েল্ডিং", "Metal Processing"],
  ["플라스틱과 고무 성형", "প্লাস্টিক ও রাবার মোল্ডিং", "Plastic and Rubber Molding"],
  ["섬유 제조", "বস্ত্র উৎপাদন", "Textile Manufacturing"],
  ["가구 제작", "আসবাবপত্র তৈরি", "Furniture Making"],
  ["건물 건설", "ভবন নির্মাণ", "Building Construction"],
  ["토목 공사", "সিভিল ইঞ্জিনিয়ারিং কাজ", "Civil Engineering"],
  ["작물 재배", "ফসল চাষ", "Crop Cultivation"],
  ["가축 관리", "গবাদিপশু ব্যবস্থাপনা", "Livestock Management"],
  ["연근해 어업과 양식", "উপকূলীয় মৎস্য ও জলজ চাষ", "Coastal Fishery and Aquaculture"],
  ["선체 건조", "জাহাজের হাল নির্মাণ", "Ship Hull Construction"],
  ["광물 자원 개발과 생산", "খনিজ সম্পদ উন্নয়ন ও উৎপাদন", "Mineral Resource Development and Production"],
  ["산림 자원 관리", "বনসম্পদ ব্যবস্থাপনা", "Forest Resource Management"],
  ["숙박 서비스", "আবাসন সেবা", "Accommodation Services"],
  ["음식 준비", "খাদ্য প্রস্তুতি", "Food Preparation"],
  ["산업 안전 보건 표지", "শিল্প নিরাপত্তা ও স্বাস্থ্য চিহ্ন", "Industrial Safety and Health Signs"],
  ["산업 안전 보건 규정", "শিল্প নিরাপত্তা ও স্বাস্থ্য বিধি", "Industrial Safety and Health Regulations"],
  ["안전 보건 장비", "নিরাপত্তা ও স্বাস্থ্য সুরক্ষা সরঞ্জাম", "Industrial Safety and Hygiene Equipment"],
  ["산업 재해와 응급 처치", "শিল্প দুর্ঘটনা ও প্রাথমিক চিকিৎসা", "Industrial Accidents and First Aid"],
  ["고용허가제", "কর্মসংস্থান অনুমতি ব্যবস্থা", "Employment Permit System"],
  ["근로기준법", "শ্রমমান আইন", "Labor Standards Act"],
  ["출입국관리법", "অভিবাসন আইন", "Immigration Act"],
  ["고용보험", "কর্মসংস্থান ও শ্রমিক বীমা", "Employment Insurance"],
];

const slugify = (en: string) =>
  en.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const CHAPTERS: ChapterMeta[] = RAW.map(([ko, bn, en], i) => ({
  chapter: i + 1,
  slug: slugify(en),
  ko,
  bn,
  en,
  category: cat(i + 1),
}));
