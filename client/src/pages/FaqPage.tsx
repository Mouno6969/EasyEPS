import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

const faqs = [
  {
    q: "EasyEPS কি সরকারি EPS-TOPIK ওয়েবসাইট?",
    a: "না। EasyEPS একটি স্বাধীন শিক্ষাসহায়ক প্ল্যাটফর্ম। এটি HRD Korea বা EPS-এর অফিসিয়াল সেবা নয়। পরীক্ষার তারিখ, নিবন্ধন ও নীতির জন্য সর্বদা সরকারি উৎস অনুসরণ করুন।",
  },
  {
    q: "শেখা শুরু করতে কী লাগবে?",
    a: "প্রথমে /basics-এ হ্যাঙ্গুল বেসিক সম্পন্ন করুন (জামো, উচ্চারণ, লেখা)। তারপর ৬০টি অধ্যায়ের পাঠ্যক্রম ও মক টেস্ট ব্যবহার করুন। অতিথি হিসেবেও শুরু করা যায়।",
  },
  {
    q: "অতিথি অগ্রগতি সাইন ইনের পর থাকবে?",
    a: "হ্যাঁ—সাইন ইন করলে এই ডিভাইসের অধ্যায় অগ্রগতি, পরীক্ষা ও পড়ার মিনিট অ্যাকাউন্টে মিশ্রিত হয় (উচ্চতর ফলাফল রাখা হয়)।",
  },
  {
    q: "সার্টিফিকেট কীভাবে পাব?",
    a: "প্রোফাইল সম্পূর্ণ করুন (নাম, ইমেইল, ছবি), যোগ্যতা পূরণ করুন (৬০ অধ্যায় বা মক ≥৮০%), তারপর প্রোফাইল থেকে সার্টিফিকেট ইস্যু করুন।",
  },
  {
    q: "Listening-এ script কেন দেখা যায় না?",
    a: "পরীক্ষার মতো শোনার অনুশীলনের জন্য script জমা দেওয়ার আগে লুকানো থাকে। জমা দেওয়ার পর লিখন ও ব্যাখ্যা দেখা যায়।",
  },
  {
    q: "ভিসা বা চাকরির পরামর্শ পাব?",
    a: "না। EasyEPS শুধু ভাষা ও পরীক্ষা প্রস্তুতি শেখায়। আইন, ভিসা, স্বাস্থ্য বা নিয়োগের জন্য দায়িত্বশীল সরকারি/কর্মক্ষেত্রের নির্দেশনা অনুসরণ করুন।",
  },
] as const;

export default function FaqPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <>
      <section className="border-b border-[var(--navy)]/10 bg-[radial-gradient(circle_at_85%_20%,rgba(204,166,92,.18),transparent_28%)]">
        <div className="container py-12 md:py-16">
          <p className="eyebrow">সাহায্য</p>
          <h1 className="mt-3 font-serif text-4xl font-bold text-[var(--navy)] md:text-5xl">প্রশ্নোত্তর (FAQ)</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--navy)]/68">
            EasyEPS কীভাবে ব্যবহার করবেন—বাংলায় সংক্ষিপ্ত উত্তর।
          </p>
        </div>
      </section>
      <div className="container max-w-3xl py-10">
        <div className="space-y-3">
          {faqs.map((item, index) => {
            const isOpen = open === index;
            return (
              <div key={item.q} className="paper-card overflow-hidden">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 p-5 text-left"
                  onClick={() => setOpen(isOpen ? null : index)}
                  aria-expanded={isOpen}
                >
                  <span className="font-bold text-[var(--navy)]">{item.q}</span>
                  <ChevronDown className={`size-5 shrink-0 text-[var(--navy)]/40 transition ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen ? <p className="border-t border-[var(--navy)]/8 px-5 pb-5 pt-3 text-sm leading-7 text-[var(--navy)]/70">{item.a}</p> : null}
              </div>
            );
          })}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/basics">
            <Button className="rounded-full bg-[var(--navy)] text-white">বেসিক শুরু</Button>
          </Link>
          <Link href="/curriculum">
            <Button variant="outline" className="rounded-full border-[var(--navy)]/15">
              পাঠ্যক্রম
            </Button>
          </Link>
        </div>
      </div>
    </>
  );
}
