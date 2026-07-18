import { Button } from "@/components/ui/button";
import { learningOverview, useLocalLearning } from "@/lib/localProgress";
import { Share2 } from "lucide-react";
import { toast } from "sonner";

/** Copy a shareable Bangla progress blurb for WhatsApp / social. */
export function ShareProgressCard() {
  const state = useLocalLearning();
  const overview = learningOverview(state);

  const share = async () => {
    const text = `EasyEPS-এ আমার EPS-TOPIK অগ্রগতি 🇰🇷
📚 সম্পন্ন অধ্যায়: ${overview.completedLessons}/60
📈 গড় স্কোর: ${overview.averageScore}%
🔥 স্ট্রিক: ${overview.streak} দিন
⏱️ অধ্যয়ন: ${overview.studyMinutes} মিনিট
#EasyEPS #EPSTOPIK #Korean`;

    try {
      if (navigator.share) {
        await navigator.share({ title: "EasyEPS progress", text });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast.success("অগ্রগতি কপি হয়েছে—WhatsApp-এ পেস্ট করুন");
    } catch {
      // cancelled
    }
  };

  return (
    <Button type="button" variant="outline" onClick={share} className="rounded-full border-[var(--navy)]/15">
      <Share2 className="size-4" />
      অগ্রগতি শেয়ার
    </Button>
  );
}
