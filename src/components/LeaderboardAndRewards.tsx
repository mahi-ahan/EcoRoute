import { useState, useEffect } from "react";
import { Trophy, Medal, Award, Sparkles, ShoppingBag, CheckCircle, ChevronRight, Gift, Leaf, Copy, Check, AlertCircle, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { WasteReport } from "../types";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

interface LeaderboardAndRewardsProps {
  reports: WasteReport[];
  language?: "EN" | "HI" | "MR" | "TA";
  isDarkMode?: boolean;
}

const translations = {
  EN: {
    title: "Swachh Warrior Leaderboard",
    subtitle: "Rise up the ranks by filing clean reports, completing group drives, and keeping India beautiful!",
    yourScore: "Your Swachh Profile",
    points: "Points earned",
    coins: "Swachh Coins",
    level: "Warrior Rank",
    leaderboardTab: "Leaderboard",
    rewardsTab: "Eco-Rewards Shop",
    rank: "Rank",
    name: "Volunteer Name",
    cleanups: "Cleanups",
    score: "Score",
    badges: "Your Earned Badges",
    redeemTitle: "Redeem Eco-Friendly Products",
    redeemSubtitle: "Swap your Swachh Coins for certified organic and green-living rewards directly supported by municipal partners.",
    claimed: "Claimed!",
    claimNow: "Redeem for",
    insufficient: "Coins Needed",
    citizenBadge: "SBM Cadet",
    silverBadge: "Sanitation Hero",
    goldBadge: "Swachh Champion",
    carbonBadge: "Net-Zero Activist",
    toastClaimed: "Reward code generated! Check your email or SMS to pick it up at your municipal center. 🇮🇳",
  },
  HI: {
    title: "स्वच्छ योद्धा लीडरबोर्ड",
    subtitle: "सफाई रिपोर्ट दर्ज करके, समूह स्वच्छता अभियानों को पूरा करके और भारत को सुंदर बनाकर रैंक में ऊपर उठें!",
    yourScore: "आपका स्वच्छ प्रोफ़ाइल",
    points: "अर्जित अंक",
    coins: "स्वच्छ सिक्के",
    level: "योद्धा रैंक",
    leaderboardTab: "लीडरबोर्ड",
    rewardsTab: "इको-पुरस्कार दुकान",
    rank: "रैंक",
    name: "स्वयंसेवक का नाम",
    cleanups: "सफाई ड्राइव",
    score: "अंक",
    badges: "आपके अर्जित बैज",
    redeemTitle: "पर्यावरण-अनुकूल उत्पाद भुनाएं",
    redeemSubtitle: "नगर पालिका भागीदारों द्वारा समर्थित प्रमाणित जैविक और हरित-जीवन पुरस्कारों के लिए अपने स्वच्छ सिक्कों का आदान-प्रदान करें।",
    claimed: "प्राप्त किया!",
    claimNow: "इसके लिए भुनाएं",
    insufficient: "सिक्कों की कमी",
    citizenBadge: "एसबीएम कैडेट",
    silverBadge: "स्वच्छता नायक",
    goldBadge: "स्वच्छ चैंपियन",
    carbonBadge: "नेट-जीरो कार्यकर्ता",
    toastClaimed: "पुरस्कार कोड जनरेट हुआ! अपने नगरपालिका केंद्र पर इसे प्राप्त करने के लिए अपना ईमेल या एसएमएस देखें। 🇮🇳",
  },
  MR: {
    title: "स्वच्छ योद्धा लीडरबोर्ड",
    subtitle: "स्वच्छता अहवाल दाखल करून, सामूहिक मोहिमा पूर्ण करून आणि भारताला सुंदर ठेवून रँकमध्ये वर जा!",
    yourScore: "तुमचे स्वच्छ प्रोफाइल",
    points: "मिळवलेले गुण",
    coins: "स्वच्छ कॉइन्स",
    level: "योद्धा रँक",
    leaderboardTab: "लीडरबोर्ड",
    rewardsTab: "इको-पुरस्कार दुकान",
    rank: "क्रमांक",
    name: "स्वयंसेवकाचे नाव",
    cleanups: "स्वच्छता मोहिमा",
    score: "गुण",
    badges: "तुमचे मिळालेले बॅजेस",
    redeemTitle: "पर्यावरणपूरक उत्पादने मिळवा",
    redeemSubtitle: "महानगरपालिका भागीदारांद्वारे समर्थित प्रमाणित सेंद्रिय आणि पर्यावरणपूरक भेटवस्तूंसाठी तुमचे स्वच्छ कॉइन्स बदला.",
    claimed: "मिळाले!",
    claimNow: "मिळवण्यासाठी",
    insufficient: "कॉइन्स कमी आहेत",
    citizenBadge: "एसबीएम कॅडेट",
    silverBadge: "स्वच्छता नायक",
    goldBadge: "स्वच्छ चॅम्पियन",
    carbonBadge: "नेट-झिरो कार्यकर्ता",
    toastClaimed: "पुरस्कार कोड तयार झाला! आपल्या नगरपालिकेच्या केंद्रात भेटवस्तू घेण्यासाठी तुमचा ईमेल किंवा एसएमएस तपासा. 🇮🇳",
  },
  TA: {
    title: "சுவச் போர்வீரர் லீடர்போர்டு",
    subtitle: "கழிவுப் புகார்களைப் பதிவு செய்து, கூட்டுத் தூய்மைப் பணிகளை முடித்து, இந்தியாவைத் தூய்மையாக்குவதன் மூலம் தரவரிசையில் உயருங்கள்!",
    yourScore: "உங்கள் சுவச் சுயவிவரம்",
    points: "பெற்ற புள்ளிகள்",
    coins: "சுவச் நாணயங்கள்",
    level: "போர்வீரர் நிலை",
    leaderboardTab: "தரவரிசை பட்டியல்",
    rewardsTab: "சுற்றுச்சூழல் கடை",
    rank: "தரவரிசை",
    name: "தன்னார்வலர் பெயர்",
    cleanups: "தூய்மை பணிகள்",
    score: "புள்ளிகள்",
    badges: "உங்கள் பதக்கங்கள்",
    redeemTitle: "சுற்றுச்சூழல் தயாரிப்புகளைப் பெறுங்கள்",
    redeemSubtitle: "நகராட்சி கூட்டாளர்களால் ஆதரிக்கப்படும் சான்றளிக்கப்பட்ட இயற்கை மற்றும் பசுமை வாழ்க்கை வெகுமதிகளுக்கு உங்கள் சுவச் நாணயங்களை மாற்றிக் கொள்ளுங்கள்.",
    claimed: "வெற்றிகரமாக பெறப்பட்டது!",
    claimNow: "நாணயங்களுக்கு மாற்றுக",
    insufficient: "நாணயங்கள் தேவை",
    citizenBadge: "எஸ்.பி.எம் கேடட்",
    silverBadge: "சுகாதார நாயகன்",
    goldBadge: "சுவச் சாம்பியன்",
    carbonBadge: "நெட்-ஜீரோ ஆர்வலர்",
    toastClaimed: "வெகுமதி குறியீடு உருவாக்கப்பட்டது! உங்கள் நகராட்சி மையத்தில் இதைப் பெற மின்னஞ்சல் அல்லது எஸ்எம்எஸ் சரிபார்க்கவும். 🇮🇳",
  }
};

interface RewardItem {
  id: string;
  title: { EN: string; HI: string; MR: string; TA: string };
  desc: { EN: string; HI: string; MR: string; TA: string };
  cost: number;
  image: string;
}

const rewardCatalog: RewardItem[] = [
  {
    id: "compost_kit",
    title: {
      EN: "Eco-Friendly Home Gardening Kit",
      HI: "इको-फ्रेंडली होम गार्डन किट",
      MR: "इको-फ्रेंडली होम गार्डन किट",
      TA: "சுற்றுச்சூழல் நட்பு வீட்டுத் தோட்ட தொகுப்பு"
    },
    desc: {
      EN: "Complete organic planting kit with coco-peat, biodegradable pots, and starter tools to grow a green balcony.",
      HI: "कोको-पीट, बायोडिग्रेडेबल पॉट्स और स्टार्टर टूल्स के साथ जैविक रोपण किट।",
      MR: "कोको-पीट, बायोडिग्रेडेबल पॉट्स आणि स्टार्टर टूल्ससह सेंद्रिय रोपण किट.",
      TA: "தேங்காய் நார் கழிவு, மக்கும் தொட்டிகள் மற்றும் வீட்டுத் தோட்டத்திற்கான கருவிகள் அடங்கிய தொகுப்பு."
    },
    cost: 150,
    image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&q=80&w=300"
  },
  {
    id: "steel_flask",
    title: {
      EN: "SBM Insulated Steel Water Flask",
      HI: "एसबीएम इंसुलेटेड स्टील पानी की बोतल",
      MR: "एसबीएम इन्सुलेटेड स्टील पाण्याची बाटली",
      TA: "எஸ்.பி.எம் இன்சுலேட்டட் ஸ்டீல் வாட்டர் பாட்டில்"
    },
    desc: {
      EN: "Premium food-grade steel bottle supporting zero-plastic mission. Keeps cold for 24 hours.",
      HI: "शून्य-प्लास्टिक मिशन का समर्थन करने वाली प्रीमियम खाद्य-ग्रेड स्टील की बोतल।",
      MR: "प्लॅस्टिकमुक्त मोहिमेला पाठिंबा देणारी फूड-ग्रेड प्रीमियम स्टीलची बाटली.",
      TA: "பிளாஸ்டிக் இல்லாத தூய்மை இயக்கத்திற்கு ஆதரவளிக்கும் பிரீமியம் எஃகு வாட்டர் பாட்டில்."
    },
    cost: 100,
    image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&q=80&w=300"
  },
  {
    id: "organic_seeds",
    title: {
      EN: "Indigenous Organic Seed Selection Bag",
      HI: "स्वदेशी जैविक बीज चयन थैली",
      MR: "स्वदेशी सेंद्रिय बियाणे बॅग",
      TA: "பாரம்பரிய இயற்கை விதைகள் தொகுப்பு"
    },
    desc: {
      EN: "Pack of 5 heirloom kitchen garden seeds (Basil, Tomato, Chilli, Mint, Coriander).",
      HI: "5 घरेलू बगीचे के जैविक बीजों का पैक (तुलसी, टमाटर, मिर्च, पुदीना, धनिया)।",
      MR: "५ विविध घरगुती सेंद्रिय बियाण्यांचा संच (तुळस, टोमॅटो, मिरची, पुदिना, कोथिंबीर).",
      TA: "5 வகையான இயற்கை வீட்டுத் தோட்ட விதைகள் தொகுப்பு (துளசி, தக்காளி, மிளகாய், புதினா, மல்லி)."
    },
    cost: 50,
    image: "https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&q=80&w=300"
  },
  {
    id: "canvas_tote",
    title: {
      EN: "Heavy Duty Recycled Canvas Tote",
      HI: "मजबूत रीसायकल कैनवास टोट बैग",
      MR: "मजबूत रिसायकल कॅनव्हास पिशवी",
      TA: "மீள்சுழற்சி செய்யப்பட்ட கேன்வாஸ் பை"
    },
    desc: {
      EN: "100% biodegradable and reusable canvas tote bag for plastic-free groceries.",
      HI: "प्लास्टिक-मुक्त खरीदारी के लिए 100% बायोडिग्रेडेबल और पुन: प्रयोज्य कैनवास बैग।",
      MR: "प्लॅस्टिकमुक्त खरेदीसाठी १००% विघटनशील आणि रिसायकल कॅनव्हास पिशवी.",
      TA: "பிளாஸ்டிக் இல்லாத மளிகைப் பொருட்களுக்கான 100% மக்கும் தன்மையுடைய கேன்வாஸ் பை."
    },
    cost: 30,
    image: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=300"
  }
];

export default function LeaderboardAndRewards({
  reports,
  language = "EN",
  isDarkMode = false
}: LeaderboardAndRewardsProps) {
  const { currentUser, googleAccessToken, reauthorizeGmail } = useAuth();
  const [activeTab, setActiveTab] = useState<"leaderboard" | "rewards">("leaderboard");
  const [claimedRewards, setClaimedRewards] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [activeVoucher, setActiveVoucher] = useState<{ reward: any; code: string; emailStatus: 'sent' | 'failed' | 'not_connected' } | null>(null);
  const [copied, setCopied] = useState(false);

  const t = translations[language] || translations.EN;

  // Calculate actual user points based on their reports in database
  const userReports = reports.filter(r => r.userId === currentUser?.uid);
  const resolvedCount = userReports.filter(r => r.status === "Resolved").length;
  const inProgressCount = userReports.filter(r => r.status === "In Progress").length;
  const pendingCount = userReports.filter(r => r.status === "Pending").length;

  // Base rewards system calculations
  const userReportPoints = pendingCount * 25 + inProgressCount * 35 + resolvedCount * 100;
  // Let's assume user starts with 40 bonus points for setting up profile and exploring
  const userTotalPoints = userReportPoints + 40;
  
  // Swachh Coins is points divided by 5 (rounded up) minus cost of claimed rewards
  const spentCoins = claimedRewards.reduce((acc, rewardId) => {
    const r = rewardCatalog.find(item => item.id === rewardId);
    return acc + (r ? r.cost : 0);
  }, 0);
  const initialCoins = Math.max(0, Math.floor(userTotalPoints / 3));
  const userCoins = Math.max(0, initialCoins - spentCoins);

  // Badges calculation
  const badgesEarned = [
    { id: "cadet", name: t.citizenBadge, icon: Award, active: userTotalPoints >= 40, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/20", desc: "Initiated cleanliness log" },
    { id: "hero", name: t.silverBadge, icon: Medal, active: resolvedCount >= 1 || userTotalPoints >= 100, color: "text-slate-400 bg-slate-50 dark:bg-slate-800/40", desc: "First verified cleanup resolved" },
    { id: "champion", name: t.goldBadge, icon: Trophy, active: resolvedCount >= 3 || userTotalPoints >= 250, color: "text-yellow-500 bg-yellow-50 dark:bg-yellow-950/20", desc: "Resolved 3+ reports" },
    { id: "carbon", name: t.carbonBadge, icon: Leaf, active: resolvedCount >= 5 || userTotalPoints >= 400, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20", desc: "Significant CO2 reduction" }
  ];

  // User Rank Designation
  let warriorRank = translations[language]?.citizenBadge || "SBM Cadet";
  if (resolvedCount >= 5 || userTotalPoints >= 400) {
    warriorRank = translations[language]?.carbonBadge || "Net-Zero Activist";
  } else if (resolvedCount >= 3 || userTotalPoints >= 250) {
    warriorRank = translations[language]?.goldBadge || "Swachh Champion";
  } else if (resolvedCount >= 1 || userTotalPoints >= 100) {
    warriorRank = translations[language]?.silverBadge || "Sanitation Hero";
  }

  // Dynamic state for real registered users from Firestore
  const [realUsers, setRealUsers] = useState<any[]>([]);

  useEffect(() => {
    const usersCollectionRef = collection(db, "users");
    const unsubscribe = onSnapshot(usersCollectionRef, (snapshot) => {
      const usersList: any[] = [];
      snapshot.forEach((doc) => {
        const u = doc.data();
        // Keep real users who are logged in with an email address
        if (u.uid && u.email && u.email.trim() !== "") {
          usersList.push({
            uid: u.uid,
            name: u.displayName || "Anonymous Volunteer",
            email: u.email,
            avatar: u.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100",
          });
        }
      });
      setRealUsers(usersList);
    }, (err) => {
      console.error("Leaderboard Firestore onSnapshot error:", err);
    });

    return () => unsubscribe();
  }, []);

  // Calculate user points dynamically for all real users
  const leadersList = realUsers.map((user) => {
    const userReports = reports.filter(r => r.userId === user.uid);
    const resolved = userReports.filter(r => r.status === "Resolved").length;
    const inProgress = userReports.filter(r => r.status === "In Progress").length;
    const pending = userReports.filter(r => r.status === "Pending").length;
    const points = pending * 25 + inProgress * 35 + resolved * 100 + 40;

    return {
      uid: user.uid,
      name: user.name,
      email: user.email,
      cleanups: resolved,
      points: points,
      isCurrent: user.uid === currentUser?.uid,
      avatar: user.avatar,
    };
  });

  // Ensure current user is always present in the local leaders state even during initial load/sync
  if (currentUser && currentUser.uid && currentUser.email && !leadersList.some(l => l.uid === currentUser.uid)) {
    leadersList.push({
      uid: currentUser.uid,
      name: currentUser.displayName || "You",
      email: currentUser.email,
      cleanups: resolvedCount,
      points: userTotalPoints,
      isCurrent: true,
      avatar: currentUser.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100",
    });
  }

  // Double check to filter only users with emails to guarantee no fake bots or empty-email entries
  const filteredLeaders = leadersList.filter(l => l.email && l.email.trim() !== "");

  // Sort Leaderboard dynamically by points in descending order
  const sortedLeaders = [...filteredLeaders].sort((a, b) => b.points - a.points);

  const handleClaimReward = async (rewardId: string) => {
    const reward = rewardCatalog.find(r => r.id === rewardId);
    if (!reward) return;

    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const voucherCode = `SBM-ECO-${randomSuffix}`;

    setClaimedRewards([...claimedRewards, rewardId]);
    setToast(t.toastClaimed);
    setTimeout(() => {
      setToast(null);
    }, 5000);

    let emailStatus: "sent" | "failed" | "not_connected" = "not_connected";

    // Send congratulations email via Gmail API if user is logged in
    if (currentUser && currentUser.email) {
      let token = googleAccessToken;
      if (!token) {
        const confirmConsent = window.confirm("To receive your SBM reward voucher details via Gmail, please click OK to connect your Google account.");
        if (confirmConsent) {
          try {
            token = await reauthorizeGmail();
          } catch (oauthErr) {
            console.error("Gmail OAuth reauthorization failed:", oauthErr);
          }
        }
      }

      if (token) {
        try {
          const rewardTitle = reward.title[language] || reward.title.EN || "Sustainable Reward";
          const success = await sendCongratulationsEmail(
            currentUser.email,
            rewardTitle,
            reward.cost,
            currentUser.displayName || "Swachh Citizen",
            token
          );
          emailStatus = success ? "sent" : "failed";
        } catch (error) {
          console.error("Failed to trigger Gmail confirmation:", error);
          emailStatus = "failed";
        }
      } else {
        emailStatus = "not_connected";
      }
    }

    setActiveVoucher({
      reward,
      code: voucherCode,
      emailStatus
    });
  };

  return (
    <div className={`p-5 rounded-2xl border flex flex-col h-full overflow-hidden ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100 shadow-sm"}`}>
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] p-4 bg-emerald-600 border border-emerald-500 rounded-2xl shadow-2xl text-white text-xs font-bold max-w-sm flex items-start gap-2.5 animate-bounce">
          <Sparkles className="h-5 w-5 shrink-0 text-yellow-300" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1.5">
          <Trophy className="h-5 w-5 text-yellow-500 animate-pulse" />
          <h3 className={`text-base font-black tracking-tight uppercase ${isDarkMode ? "text-white" : "text-slate-800"}`}>
            {t.title}
          </h3>
        </div>
        <p className={`text-[11px] leading-relaxed ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
          {t.subtitle}
        </p>
      </div>

      {/* Warrior Profile summary banner */}
      <div className={`p-4 rounded-xl border mb-5 grid grid-cols-3 gap-3 items-center text-center ${isDarkMode ? "bg-slate-950 border-slate-800/80 text-white" : "bg-slate-50/70 border-slate-100"}`}>
        <div className="space-y-1">
          <span className={`text-[10px] font-bold block uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{t.level}</span>
          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 block truncate px-0.5">{warriorRank}</span>
        </div>
        <div className="space-y-1 border-x border-slate-200/50 dark:border-slate-800/50">
          <span className={`text-[10px] font-bold block uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{t.points}</span>
          <span className="text-base font-black text-orange-600 dark:text-orange-400 block">{userTotalPoints}</span>
        </div>
        <div className="space-y-1">
          <span className={`text-[10px] font-bold block uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{t.coins}</span>
          <span className="text-base font-black text-yellow-500 block flex items-center justify-center gap-1">
            <Gift className="h-4 w-4 shrink-0 text-yellow-400 animate-bounce" style={{ animationDuration: "3s" }} />
            {userCoins}
          </span>
        </div>
      </div>

      {/* Nav Tabs */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-950 rounded-xl mb-4 border border-slate-200/40 dark:border-slate-800/60 shrink-0">
        <button
          onClick={() => setActiveTab("leaderboard")}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === "leaderboard"
              ? isDarkMode ? "bg-slate-800 text-white shadow-sm" : "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-400"
          }`}
        >
          {t.leaderboardTab}
        </button>
        <button
          onClick={() => setActiveTab("rewards")}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === "rewards"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-400"
          }`}
        >
          <ShoppingBag className="h-3.5 w-3.5" />
          {t.rewardsTab}
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto pr-1 min-h-0">
        {activeTab === "leaderboard" ? (
          <div className="space-y-4">
            {/* Dynamic sorted leaderboard list */}
            <div className="space-y-1.5">
              {sortedLeaders.map((leader, index) => {
                const rank = index + 1;
                let rankStyle = "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
                let icon = null;
                if (rank === 1) {
                  rankStyle = "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30";
                  icon = <Trophy className="h-3.5 w-3.5 text-yellow-500 shrink-0" />;
                } else if (rank === 2) {
                  rankStyle = "bg-slate-400/20 text-slate-400 border border-slate-400/30";
                  icon = <Medal className="h-3.5 w-3.5 text-slate-400 shrink-0" />;
                } else if (rank === 3) {
                  rankStyle = "bg-amber-600/20 text-amber-600 border border-amber-600/30";
                  icon = <Award className="h-3.5 w-3.5 text-amber-600 shrink-0" />;
                }

                return (
                  <div
                    key={leader.uid}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      leader.isCurrent
                        ? "bg-emerald-500/10 border-emerald-500/30 ring-2 ring-emerald-500/15"
                        : isDarkMode ? "bg-slate-900/40 border-slate-800 hover:bg-slate-850" : "bg-white border-slate-100 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0 ${rankStyle}`}>
                        {icon ? icon : rank}
                      </div>
                      <img
                        src={leader.avatar}
                        alt={leader.name}
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-800 shrink-0"
                      />
                      <div className="min-w-0">
                        <span className={`text-xs font-black block truncate ${leader.isCurrent ? "text-emerald-700 dark:text-emerald-400" : isDarkMode ? "text-white" : "text-slate-800"}`}>
                          {leader.name} {leader.isCurrent && " (You)"}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">
                          {leader.cleanups} {t.cleanups}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-orange-600 dark:text-orange-400 whitespace-nowrap">
                      {leader.points} Pts
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Badges Section */}
            <div className="pt-2">
              <h4 className={`text-[10px] font-black uppercase tracking-wider mb-2.5 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                {t.badges}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {badgesEarned.map((badge) => {
                  const Icon = badge.icon;
                  return (
                    <div
                      key={badge.id}
                      className={`p-2.5 rounded-xl border flex items-start gap-2 transition-all ${
                        badge.active
                          ? isDarkMode ? "bg-slate-800/80 border-emerald-800/50" : "bg-slate-50 border-emerald-100"
                          : "opacity-40 filter grayscale"
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg shrink-0 ${badge.active ? badge.color : "bg-slate-100 text-slate-400 dark:bg-slate-800"}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <span className={`text-[10px] font-black block truncate ${badge.active ? "text-slate-800 dark:text-slate-100" : "text-slate-400"}`}>
                          {badge.name}
                        </span>
                        <span className="text-[8px] text-slate-400 leading-tight block">
                          {badge.desc}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-150/50 dark:border-slate-800/80 text-center">
              <Gift className="h-5 w-5 mx-auto mb-1 text-emerald-500 animate-bounce" />
              <h4 className={`text-[11px] font-black leading-tight ${isDarkMode ? "text-slate-100" : "text-slate-800"}`}>
                {t.redeemTitle}
              </h4>
              <p className={`text-[9.5px] leading-relaxed mt-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                {t.redeemSubtitle}
              </p>
            </div>

            {/* Reward Catalog Cards */}
            <div className="space-y-3">
              {rewardCatalog.map((reward) => {
                const isClaimed = claimedRewards.includes(reward.id);
                const canAfford = userCoins >= reward.cost;
                const titleText = reward.title[language] || reward.title.EN;
                const descText = reward.desc[language] || reward.desc.EN;

                return (
                  <div
                    key={reward.id}
                    className={`p-3 rounded-xl border flex gap-3 items-center transition-all ${
                      isDarkMode ? "bg-slate-900/40 border-slate-800" : "bg-white border-slate-100"
                    }`}
                  >
                    <img
                      src={reward.image}
                      alt={titleText}
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 object-cover rounded-lg border border-slate-100 dark:border-slate-800 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h5 className={`text-[10.5px] font-black leading-tight truncate ${isDarkMode ? "text-slate-100" : "text-slate-800"}`}>
                        {titleText}
                      </h5>
                      <p className={`text-[9px] leading-relaxed line-clamp-2 mt-0.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                        {descText}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[10px] font-bold text-yellow-500 flex items-center gap-0.5">
                          🪙 {reward.cost}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isClaimed ? (
                        <span className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold flex items-center gap-1 border border-emerald-500/20">
                          <CheckCircle className="h-3.5 w-3.5" />
                          {t.claimed}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleClaimReward(reward.id)}
                          disabled={!canAfford}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer shadow-sm transition-all ${
                            canAfford
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200/20"
                          }`}
                        >
                          {canAfford ? `${t.claimNow} 🪙 ${reward.cost}` : `${t.insufficient}`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Beautiful Interactive Voucher Claim Modal */}
        {activeVoucher && (
          <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-fade-in">
            <div className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl relative transition-all overflow-hidden ${isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-100 text-slate-800"}`}>
              
              {/* Background gradient flares */}
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-orange-500 via-yellow-400 to-emerald-500"></div>
              
              {/* Close Button */}
              <button
                onClick={() => {
                  setActiveVoucher(null);
                  setCopied(false);
                }}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>

              <div className="flex flex-col items-center text-center mt-2">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-emerald-500 text-white flex items-center justify-center mb-3.5 shadow-md border border-emerald-500/20">
                  <Gift className="h-6 w-6 text-white animate-bounce" style={{ animationDuration: "3.5s" }} />
                </div>

                <h3 className="text-sm font-black tracking-tight uppercase bg-gradient-to-r from-orange-500 to-emerald-600 bg-clip-text text-transparent">
                  SBM Citizen Eco-Voucher
                </h3>
                <p className="text-[9px] font-black tracking-widest uppercase text-slate-400 mt-1">
                  Ek Kadam Swachhata Ki Ore 🇮🇳
                </p>

                {/* Simulated Ticket Ticket Stubs/Aesthetic */}
                <div className="w-full my-4.5 p-4 rounded-2xl border-2 border-dashed border-emerald-500/30 bg-emerald-500/[0.03] relative">
                  {/* Left & Right Notch Circles for Coupon Look */}
                  <div className={`absolute -left-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border border-dashed border-emerald-500/30 ${isDarkMode ? "bg-slate-900" : "bg-white"}`}></div>
                  <div className={`absolute -right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border border-dashed border-emerald-500/30 ${isDarkMode ? "bg-slate-900" : "bg-white"}`}></div>

                  <span className="text-[8px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">Redeemed Reward</span>
                  <h4 className="text-xs font-black text-slate-800 dark:text-white">
                    {activeVoucher.reward.title[language] || activeVoucher.reward.title.EN}
                  </h4>
                  <p className="text-[9.5px] text-slate-400 font-bold mt-1">
                    Value: 🪙 {activeVoucher.reward.cost} Swachh Coins
                  </p>

                  <div className="my-3.5 border-t border-dashed border-slate-200 dark:border-slate-800"></div>

                  <span className="text-[8px] font-extrabold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider block mb-1.5">Your Unique Voucher Code</span>
                  <div className="flex items-center justify-between gap-2 p-2 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 tracking-wider font-mono">
                      {activeVoucher.code}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(activeVoucher.code);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg text-slate-400 hover:text-emerald-500 transition-colors cursor-pointer"
                      title="Copy Code"
                    >
                      {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Email dispatch feedback note */}
                <div className="w-full p-3.5 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800/40 text-left space-y-2">
                  <h5 className="text-[9.5px] font-black uppercase text-slate-500 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                    <span>Voucher Instructions & Verification</span>
                  </h5>
                  <p className="text-[9px] leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
                    Present this code at your nearest Swachh Urban collection point or redeem online with municipal merchant partners. Keep this code secure!
                  </p>

                  {activeVoucher.emailStatus === "sent" && (
                    <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 mt-2">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                      <p className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                        📧 Voucher Dispatched to {currentUser?.email}!
                      </p>
                    </div>
                  )}

                  {activeVoucher.emailStatus === "failed" && (
                    <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2 mt-2">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-[9px] leading-normal font-bold text-amber-700 dark:text-amber-300">
                        <strong className="block uppercase text-[8px] font-black mb-0.5">⚠️ Gmail Verification Warning</strong>
                        Since this app is in sandbox development mode, Gmail authorization was bypassed or rejected. <strong>Please copy your code above now</strong> so you don't lose it!
                      </p>
                    </div>
                  )}

                  {activeVoucher.emailStatus === "not_connected" && (
                    <div className="p-2 bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-xl flex items-center gap-2 mt-2">
                      <p className="text-[9px] font-bold text-slate-500">
                        🔗 Gmail not connected. Copy the code above to keep it.
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    setActiveVoucher(null);
                    setCopied(false);
                  }}
                  className="w-full mt-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/10 text-white text-[9.5px] font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all"
                >
                  Got It, Close! 🌟
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

async function sendCongratulationsEmail(
  email: string,
  rewardName: string,
  cost: number,
  userDisplayName: string,
  token: string
): Promise<boolean> {
  try {
    const subject = `Congratulations! You successfully redeemed ${rewardName} 🪙`;
    const body = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #f97316 0%, #ffffff 50%, #16a34a 100%); padding: 25px; text-align: center; border-bottom: 2px solid #e2e8f0; border-radius: 12px 12px 0 0;">
          <h1 style="color: #15803d; margin: 0; font-weight: 900; letter-spacing: -0.5px; font-size: 20px;">SWACHH BHARAT MISSION</h1>
          <p style="margin: 5px 0 0 0; color: #1e293b; font-size: 11px; font-weight: bold; text-transform: uppercase; tracking-wider;">ECOROUTE CITIZEN REWARDS</p>
        </div>
        <div style="padding: 24px; line-height: 1.6; color: #334155;">
          <h2 style="color: #0f172a; margin-top: 0; font-size: 16px;">Congratulations, ${userDisplayName}! 🎉</h2>
          <p>You have successfully redeemed your Swachh Coins for a certified sustainable reward! Thank you for actively contributing to a clean, hygienic, and waste-free India.</p>
          
          <div style="background-color: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #1e293b;"><strong>🎁 Redeemed Reward:</strong> ${rewardName}</p>
            <p style="margin: 0; font-size: 13px; color: #1e293b;"><strong>🪙 Swachh Coins Deducted:</strong> ${cost} Coins</p>
          </div>
          
          <p>Your reward coupon and collection guidelines will be dispatched shortly by your municipal authority. Every small step makes a big difference in our collective journey toward "Ek Kadam Swachhata Ki Ore"! 🇮🇳</p>
          
          <p style="margin-top: 24px; margin-bottom: 0; font-size: 12px; color: #475569;">Warm regards,<br><strong>SBM EcoRoute Support Team</strong></p>
        </div>
        <div style="background-color: #f1f5f9; padding: 14px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
          एक कदम स्वच्छता की ओर | Swachh Bharat Mission (Urban & Rural)
        </div>
      </div>
    `;

    const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
    const emailLines = [
      `To: ${email}`,
      `Subject: ${utf8Subject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=utf-8",
      "Content-Transfer-Encoding: 7bit",
      "",
      body
    ];
    const emailString = emailLines.join("\r\n");

    const base64Safe = btoa(unescape(encodeURIComponent(emailString)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        raw: base64Safe,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gmail API failed to send congratulations email:", errorText);
      return false;
    } else {
      console.log("Congratulations email sent successfully via Gmail!");
      return true;
    }
  } catch (error) {
    console.error("Failed to send congratulations email:", error);
    return false;
  }
}
