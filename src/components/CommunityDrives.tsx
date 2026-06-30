import React, { useState, useEffect } from "react";
import { Users as UsersIcon, Calendar as CalendarIcon, Clock as ClockIcon, MapPin as MapPinIcon, Plus as PlusIcon, CheckCircle as CheckIcon, Sparkles, Award, ShieldCheck, Heart, Trash2, X, MessageSquare, Send } from "lucide-react";
import { collection, query, onSnapshot, doc, setDoc, updateDoc, addDoc, deleteDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db as firestoreDb, handleFirestoreError, OperationType } from "../firebase";
import { useAuth as useAuthHook } from "../context/AuthContext";

export interface CommunityDrive {
  id: string;
  title: string;
  description: string;
  locationName: string;
  date: string;
  time: string;
  creatorId: string;
  creatorName: string;
  volunteers: string[]; // array of user UIDs
  isCertified: boolean; // certified by municipal staff
  lat: number;
  lng: number;
}

interface CommunityDrivesProps {
  language?: "EN" | "HI" | "MR" | "TA";
  isDarkMode?: boolean;
  onOpenProfile?: () => void;
}

const translations = {
  EN: {
    title: "SBM Community Cleanup Drives",
    subtitle: "Coordinate voluntary sweeping events and community waste retrieval. Join existing neighborhood campaigns or launch your own!",
    launchBtn: "Schedule SBM Clean Drive",
    volunteers: "Volunteers joined",
    joinBtn: "Join Campaign",
    leaveBtn: "Joined! (Leave)",
    certifiedBadge: "SBM Municipal Certified",
    certifyDrive: "Certify Community Drive",
    createTitle: "Organize a Neighborhood Swachh Drive",
    formTitle: "Campaign Title",
    formDesc: "Focus & Objective (e.g. Cleansing dry plastic, clearing drain water path)",
    formLoc: "Meeting Spot Location",
    formDate: "Date",
    formTime: "Meeting Time",
    submitBtn: "Launch SBM Volunteer Drive",
    cancelBtn: "Cancel",
    noDrives: "No community drives scheduled yet.",
    toastJoined: "Successfully joined! You earned +10 Swachh points for RSVP. 🇮🇳",
    toastLeft: "Left the cleaning group.",
    toastCreated: "Successfully registered campaign! Earn +100 bonus Swachh points upon staff certification. 🇮🇳",
    toastCertified: "Municipal clearance granted! +100 bonus Swachh coins dispatched to all volunteer profiles.",
    creatorLabel: "Initiated by",
  },
  HI: {
    title: "एसबीएम सामुदायिक स्वच्छता अभियान",
    subtitle: "स्वैच्छिक झाड़ू लगाने और सामुदायिक कचरा हटाने के कार्यक्रमों का समन्वय करें। पड़ोस के अभियानों में शामिल हों या अपना खुद का शुरू करें!",
    launchBtn: "स्वच्छता ड्राइव निर्धारित करें",
    volunteers: "स्वयंसेवक शामिल हुए",
    joinBtn: "अभियान में शामिल हों",
    leaveBtn: "शामिल हैं! (छोड़ें)",
    certifiedBadge: "एसबीएम नगर पालिका प्रमाणित",
    certifyDrive: "अभियान प्रमाणित करें",
    createTitle: "पड़ोस स्वच्छता अभियान का आयोजन करें",
    formTitle: "अभियान का शीर्षक",
    formDesc: "फोकस और उद्देश्य (जैसे सूखा प्लास्टिक कचरा साफ करना, जल निकासी मार्ग को साफ करना)",
    formLoc: "मिलने का स्थान",
    formDate: "तारीख",
    formTime: "बैठक का समय",
    submitBtn: "स्वयंसेवक अभियान शुरू करें",
    cancelBtn: "रद्द करें",
    noDrives: "अभी तक कोई सामुदायिक अभियान निर्धारित नहीं किया गया है।",
    toastJoined: "सफलतापूर्वक शामिल हुए! आपको आरएसवीपी के लिए +10 स्वच्छ अंक मिले। 🇮🇳",
    toastLeft: "सफाई समूह छोड़ दिया।",
    toastCreated: "अभियान सफलतापूर्वक पंजीकृत! कर्मचारियों के सत्यापन पर +100 बोनस स्वच्छ अंक अर्जित करें। 🇮🇳",
    toastCertified: "नगरपालिका से मंजूरी मिल गई! सभी स्वयंसेवक प्रोफाइल पर +100 बोनस सिक्के भेजे गए।",
    creatorLabel: "प्रारंभकर्ता",
  },
  MR: {
    title: "एसबीएम सामुदायिक स्वच्छता मोहीम",
    subtitle: "नागरिकांच्या स्वयंसेवक स्वच्छता मोहिमांचे आयोजन. परिसरातील मोहिमांमध्ये सहभागी व्हा किंवा तुमची स्वतःची नवीन मोहीम सुरू करा!",
    launchBtn: "नवीन स्वच्छता मोहीम आयोजित करा",
    volunteers: "सहभागी स्वयंसेवक",
    joinBtn: "मोहिमेत सामील व्हा",
    leaveBtn: "सामील आहात! (बाहेर पडा)",
    certifiedBadge: "एसबीएम पालिका प्रमाणित",
    certifyDrive: "मोहीम अधिकृत करा",
    createTitle: "परिसरात सामूहिक स्वच्छता मोहीम आयोजित करा",
    formTitle: "मोहिमेचे नाव",
    formDesc: "मुख्य उद्देश (उदा. सुका कचरा गोळा करणे, सांडपाणी मार्ग मोकळा करणे)",
    formLoc: "एकत्र येण्याचे ठिकाण",
    formDate: "दिनांक",
    formTime: "एकत्र येण्याची वेळ",
    submitBtn: "मोहीम सुरू करा",
    cancelBtn: "रद्द करा",
    noDrives: "अद्याप कोणतीही सामुदायिक मोहीम आयोजित केलेली नाही.",
    toastJoined: "यशस्वीरित्या सामील झालात! तुम्हाला मोहिमेत सहभागासाठी +१० गुण मिळाले. 🇮🇳",
    toastLeft: "स्वच्छता समूहातून बाहेर पडलात.",
    toastCreated: "मोहीम नोंदणी यशस्वी! पालिका प्रमाणपत्र मिळाल्यावर +१०० गुण मिळतील. 🇮🇳",
    toastCertified: "महानगरपालिकेकडून मोहीम प्रमाणित! सर्व स्वयंसेवकांना +१०० बोनस कॉइन्स मिळाले.",
    creatorLabel: "आयोजक",
  },
  TA: {
    title: "எஸ்.பி.எம் கூட்டுத் தூய்மைப் பணிகள்",
    subtitle: "கூட்டுத் தூய்மைப் பணிகள் மற்றும் வீதி சுத்தம் செய்யும் நிகழ்வுகளை ஒருங்கிணைக்கவும். உங்கள் பகுதியில் உள்ள நிகழ்வுகளில் இணையவும் அல்லது புதிதாகத் தொடங்கவும்!",
    launchBtn: "தூய்மைப் பணியை திட்டமிடு",
    volunteers: "இணைந்த தன்னார்வலர்கள்",
    joinBtn: "இயக்கத்தில் இணை",
    leaveBtn: "இணைந்துள்ளீர்கள்! (விலகு)",
    certifiedBadge: "நகராட்சி அங்கீகாரம் பெற்றது",
    certifyDrive: "தூய்மை பணியை அங்கீகரி",
    createTitle: "உங்கள் பகுதியில் தூய்மைப் பணியை உருவாக்குங்கள்",
    formTitle: "இயக்கத்தின் பெயர்",
    formDesc: "நோக்கம் (எ.கா. பிளாஸ்டிக் உலர் கழிவுகளை அகற்றுதல், வடிகால் தூய்மை)",
    formLoc: "கூடும் இடம்",
    formDate: "தேதி",
    formTime: "நேரம்",
    submitBtn: "தூய்மை இயக்கத்தைத் தொடங்கு",
    cancelBtn: "ரத்து செய்",
    noDrives: "தற்போது கூட்டுத் தூய்மைப் பணிகள் எதுவும் திட்டமிடப்படவில்லை.",
    toastJoined: "வெற்றிகரமாக இணைந்தீர்கள்! உங்களுக்கு +10 சுவச் புள்ளிகள் கிடைத்துள்ளன. 🇮🇳",
    toastLeft: "இயக்கத்தில் இருந்து விலகினீர்கள்.",
    toastCreated: "தூய்மைப் பணி வெற்றிகரமாக உருவாக்கப்பட்டது! நகராட்சி அங்கீகாரத்திற்குப் பின் +100 புள்ளிகள் வழங்கப்படும். 🇮🇳",
    toastCertified: "நகராட்சி அங்கீகாரம் வழங்கப்பட்டது! தன்னார்வலர்களுக்கு +100 போனஸ் நாணயங்கள் அனுப்பப்பட்டன.",
    creatorLabel: "உருவாக்கியவர்",
  }
};

// Initial realistic default drives to display instantly if none in database
const DEFAULT_DRIVES: CommunityDrive[] = [
  {
    id: "default_drive_1",
    title: "SBM Swachh Sunday Clean Sweep Drive",
    description: "Mass volunteer cleanup focusing on dry waste and plastic salvage along public park tracks. Trash bags and gloves provided.",
    locationName: "Sanjay Gandhi National Park Entry Area",
    date: "2026-07-05",
    time: "07:30 AM",
    creatorId: "officer_123",
    creatorName: "Swachh Sanitation Officer",
    volunteers: ["staff_mock_123", "volunteer_1", "volunteer_2"],
    isCertified: true,
    lat: 19.22,
    lng: 72.86
  },
  {
    id: "default_drive_2",
    title: "Citizen Monsoon Canal Clearance",
    description: "Clearing plastic bottles and clogging debris from local drains to prevent water logging in upcoming monsoons.",
    locationName: "Sector 14 Drainage Junction, Vashi",
    date: "2026-07-12",
    time: "08:00 AM",
    creatorId: "leader_4",
    creatorName: "Ananya Iyer",
    volunteers: ["volunteer_3", "volunteer_4"],
    isCertified: false,
    lat: 19.03,
    lng: 73.01
  }
];

export default function CommunityDrives({
  language = "EN",
  isDarkMode = false,
  onOpenProfile
}: CommunityDrivesProps) {
  const { currentUser, userProfile } = useAuthHook();
  const [drives, setDrives] = useState<CommunityDrive[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationName, setLocationName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const [selectedViewerProfile, setSelectedViewerProfile] = useState<{ uid: string; displayName: string; photoURL?: string; role?: string } | null>(null);
  const [expandedChatDriveId, setExpandedChatDriveId] = useState<string | null>(null);

  const t = translations[language] || translations.EN;

  // Sync real-time with Firestore with default fallback
  useEffect(() => {
    const drivesCollectionRef = collection(firestoreDb, "community_drives");
    const q = query(drivesCollectionRef);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: CommunityDrive[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as CommunityDrive);
      });
      
      // If Firestore is empty, seed it with DEFAULT_DRIVES once so there is beautiful data
      if (data.length === 0) {
        setDrives(DEFAULT_DRIVES);
        // We write them to Firestore to seed it permanently
        DEFAULT_DRIVES.forEach(async (d) => {
          try {
            await setDoc(doc(drivesCollectionRef, d.id), d);
          } catch (e) {
            console.warn("Failed to seed default drives, displaying locally.", e);
          }
        });
      } else {
        setDrives(data);
      }
    });

    return () => unsubscribe();
  }, []);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const handleJoinLeave = async (driveId: string) => {
    if (!currentUser) return;
    const drive = drives.find(d => d.id === driveId);
    if (!drive) return;

    const isVolunteering = drive.volunteers.includes(currentUser.uid);
    const driveDocRef = doc(firestoreDb, "community_drives", driveId);

    try {
      setError(null);
      if (isVolunteering) {
        const updatedVolunteers = drive.volunteers.filter(uid => uid !== currentUser.uid);
        const updatedDetails = ((drive as any).volunteerDetails || []).filter((v: any) => v.uid !== currentUser.uid);
        await updateDoc(driveDocRef, {
          volunteers: updatedVolunteers,
          volunteerDetails: updatedDetails
        });
        triggerToast(t.toastLeft);
      } else {
        const newDetail = {
          uid: currentUser.uid,
          displayName: userProfile?.displayName || currentUser.displayName || "Citizen Volunteer",
          photoURL: userProfile?.photoURL || currentUser.photoURL || ""
        };
        const updatedVolunteers = [...drive.volunteers, currentUser.uid];
        const updatedDetails = [...((drive as any).volunteerDetails || []), newDetail];
        await updateDoc(driveDocRef, {
          volunteers: updatedVolunteers,
          volunteerDetails: updatedDetails
        });
        triggerToast(t.toastJoined);
      }
    } catch (err) {
      console.error("Error joining/leaving drive:", err);
      handleFirestoreError(err, OperationType.UPDATE, `community_drives/${driveId}`);
      setError("Failed to update volunteer participation. Please check permissions.");
    }
  };

  const handleCertify = async (driveId: string) => {
    const driveDocRef = doc(firestoreDb, "community_drives", driveId);
    try {
      setError(null);
      await updateDoc(driveDocRef, {
        isCertified: true
      });
      triggerToast(t.toastCertified);
    } catch (err) {
      console.error("Error certifying drive:", err);
      handleFirestoreError(err, OperationType.UPDATE, `community_drives/${driveId}`);
      setError("Failed to certify community drive. Please try again.");
    }
  };

  const handleDeleteDrive = async (driveId: string) => {
    if (!confirm("Are you sure you want to delete this clean-up drive?")) return;
    const driveDocRef = doc(firestoreDb, "community_drives", driveId);
    try {
      setError(null);
      await deleteDoc(driveDocRef);
    } catch (err) {
      console.error("Error deleting drive:", err);
      handleFirestoreError(err, OperationType.DELETE, `community_drives/${driveId}`);
      setError("Failed to delete community drive. Please try again.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const newDrive: Omit<CommunityDrive, "id"> & { creatorPhotoURL?: string; volunteerDetails?: any[] } = {
      title,
      description,
      locationName,
      date,
      time,
      creatorId: currentUser.uid,
      creatorName: currentUser.displayName || "Citizen Volunteer",
      creatorPhotoURL: userProfile?.photoURL || currentUser.photoURL || "",
      volunteers: [currentUser.uid],
      volunteerDetails: [{
        uid: currentUser.uid,
        displayName: userProfile?.displayName || currentUser.displayName || "Citizen Volunteer",
        photoURL: userProfile?.photoURL || currentUser.photoURL || ""
      }],
      isCertified: userProfile?.role === "staff", // auto-certified if created by staff
      lat: 19.076 + (Math.random() - 0.5) * 0.1, // random coordinates near Mumbai
      lng: 72.877 + (Math.random() - 0.5) * 0.1
    };

    try {
      setError(null);
      const drivesCollectionRef = collection(firestoreDb, "community_drives");
      await addDoc(drivesCollectionRef, newDrive);
      
      // Reset form
      setTitle("");
      setDescription("");
      setLocationName("");
      setDate("");
      setTime("");
      setShowCreateForm(false);
      triggerToast(t.toastCreated);
    } catch (err) {
      console.error("Error creating community drive:", err);
      handleFirestoreError(err, OperationType.CREATE, "community_drives");
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to launch SBM Volunteer Drive: ${errorMessage}`);
    }
  };

  return (
    <div className={`p-5 rounded-2xl border flex flex-col h-full overflow-hidden ${isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-100 shadow-sm"}`}>
      {/* Toast popup */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] p-4 bg-emerald-600 border border-emerald-500 rounded-2xl shadow-2xl text-white text-xs font-bold max-w-sm flex items-start gap-2.5 animate-bounce">
          <Sparkles className="h-5 w-5 shrink-0 text-yellow-300" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="min-w-0 pr-2">
          <div className="flex items-center gap-1.5 mb-1">
            <UsersIcon className="h-5 w-5 text-emerald-500 animate-pulse" />
            <h3 className={`text-base font-black tracking-tight uppercase truncate ${isDarkMode ? "text-white" : "text-slate-800"}`}>
              {t.title}
            </h3>
          </div>
          <p className={`text-[10.5px] leading-relaxed line-clamp-2 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
            {t.subtitle}
          </p>
        </div>

        {!showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition-all shrink-0 cursor-pointer flex items-center justify-center gap-1 text-[11px] font-black"
          >
            <PlusIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{t.launchBtn}</span>
          </button>
        )}
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1">
        {showCreateForm ? (
          <form onSubmit={handleSubmit} className="space-y-4 border rounded-xl p-4 bg-slate-50 dark:bg-slate-950 border-slate-150/50 dark:border-slate-850">
            <h4 className={`text-xs font-black uppercase tracking-wider flex items-center gap-1 ${isDarkMode ? "text-white" : "text-slate-800"}`}>
              <Sparkles className="h-4 w-4 text-emerald-500" />
              {t.createTitle}
            </h4>

            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-[10.5px] font-bold rounded-xl">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-wider block text-slate-500 dark:text-slate-400">
                {t.formTitle}
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Sunday Cleansing Sweep"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`w-full text-xs px-3 py-2 rounded-lg border font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/25 ${
                  isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-250 text-slate-800"
                }`}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-wider block text-slate-500 dark:text-slate-400">
                {t.formDesc}
              </label>
              <textarea
                required
                rows={2}
                placeholder="Describe focus, meeting instructions, required tools..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`w-full text-xs px-3 py-2 rounded-lg border font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/25 ${
                  isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-250 text-slate-800"
                }`}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-wider block text-slate-500 dark:text-slate-400">
                {t.formLoc}
              </label>
              <input
                type="text"
                required
                placeholder="Meeting point address"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                className={`w-full text-xs px-3 py-2 rounded-lg border font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/25 ${
                  isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-250 text-slate-800"
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider block text-slate-500 dark:text-slate-400">
                  {t.formDate}
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={`w-full text-xs px-3 py-2 rounded-lg border font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/25 ${
                    isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-250 text-slate-800"
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider block text-slate-500 dark:text-slate-400">
                  {t.formTime}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 07:30 AM"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className={`w-full text-xs px-3 py-2 rounded-lg border font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/25 ${
                    isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-250 text-slate-800"
                  }`}
                />
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="submit"
                className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer"
              >
                {t.submitBtn}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className={`px-4 py-2 text-xs font-black rounded-xl border transition-all cursor-pointer ${
                  isDarkMode ? "bg-slate-800 border-slate-750 text-slate-300 hover:bg-slate-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {t.cancelBtn}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {/* Complete Profile banner */}
            {currentUser && onOpenProfile && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-500/10 via-white/5 to-emerald-500/10 border border-emerald-500/20 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
                <div className="flex items-center gap-3">
                  {userProfile?.photoURL ? (
                    <img
                      src={userProfile.photoURL}
                      alt={userProfile.displayName || ""}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-xl object-cover border border-emerald-500/30 shadow-sm shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-emerald-500 text-white text-base font-black flex items-center justify-center shrink-0 shadow-sm border border-emerald-500/30">
                      {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : "U"}
                    </div>
                  )}
                  <div className="text-left">
                    <h4 className={`text-[11px] font-black ${isDarkMode ? "text-white" : "text-slate-800"} flex items-center gap-1.5`}>
                      <span>Complete Your Swachh Profile</span>
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    </h4>
                    <p className="text-[9.5px] font-semibold text-slate-400 mt-0.5">
                      Add a custom photo and display name so fellow Swachh volunteers can identify you!
                    </p>
                  </div>
                </div>
                <button
                  onClick={onOpenProfile}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[9.5px] font-black rounded-xl cursor-pointer shadow-sm shrink-0 transition-all uppercase tracking-wider"
                >
                  Complete Profile ⚙️
                </button>
              </div>
            )}

            {drives.length === 0 ? (
              <div className="text-center py-12">
                <UsersIcon className="h-10 w-10 text-slate-300 mx-auto mb-2.5 animate-bounce" />
                <p className={`text-xs font-bold ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  {t.noDrives}
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {drives.map((drive) => {
                  const isVolunteering = currentUser ? drive.volunteers.includes(currentUser.uid) : false;
                  const isCreator = currentUser ? drive.creatorId === currentUser.uid : false;
                  const isStaff = userProfile?.role === "staff";

                  return (
                    <div
                      key={drive.id}
                      className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                        drive.isCertified
                          ? "border-emerald-500/20 bg-emerald-500/[0.02] dark:bg-emerald-500/[0.01]"
                          : isDarkMode ? "bg-slate-900/40 border-slate-850" : "bg-white border-slate-100"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2.5 mb-2.5">
                        <div className="min-w-0">
                          <h4 className={`text-xs font-extrabold leading-snug flex items-center gap-1.5 flex-wrap ${isDarkMode ? "text-slate-100" : "text-slate-800"}`}>
                            {drive.title}
                            {drive.isCertified && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[8.5px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                <ShieldCheck className="h-2.5 w-2.5" />
                                {t.certifiedBadge}
                              </span>
                            )}
                          </h4>
                          <p className={`text-[10px] leading-relaxed mt-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                            {drive.description}
                          </p>
                        </div>

                        {(isCreator || isStaff) && (
                          <button
                            onClick={() => handleDeleteDrive(drive.id)}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors"
                            title="Delete campaign"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Location & Time markers */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 py-2 border-y border-slate-100 dark:border-slate-800/60 mb-3.5 text-[10px] font-bold text-slate-400">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <MapPinIcon className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                          <span className="truncate">{drive.locationName}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <CalendarIcon className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                          <span>{drive.date} | {drive.time}</span>
                        </span>
                      </div>

                      {/* Action block */}
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <div className="flex -space-x-1.5 overflow-hidden">
                            {((drive as any).volunteerDetails || []).slice(0, 3).map((vol: any, idx: number) => {
                              const titleAttr = vol.displayName || "SBM Volunteer";
                              return vol.photoURL ? (
                                <img
                                  key={idx}
                                  src={vol.photoURL}
                                  alt={titleAttr}
                                  title={titleAttr}
                                  referrerPolicy="no-referrer"
                                  onClick={() => setSelectedViewerProfile({ uid: vol.uid, displayName: vol.displayName, photoURL: vol.photoURL })}
                                  className="w-5.5 h-5.5 rounded-full border-2 border-white dark:border-slate-900 object-cover shrink-0 cursor-pointer hover:scale-105 transition-all"
                                />
                              ) : (
                                <div
                                  key={idx}
                                  title={titleAttr}
                                  onClick={() => setSelectedViewerProfile({ uid: vol.uid, displayName: vol.displayName, role: "user" })}
                                  className="w-5.5 h-5.5 rounded-full border-2 border-white dark:border-slate-900 bg-emerald-600 text-white text-[8px] font-black flex items-center justify-center uppercase shrink-0 cursor-pointer hover:scale-105 transition-all"
                                >
                                  {vol.displayName ? vol.displayName.charAt(0).toUpperCase() : "V"}
                                </div>
                              );
                            })}
                            {/* Fallback for legacy drives */}
                            {!((drive as any).volunteerDetails) && drive.volunteers.slice(0, 3).map((vUid, idx) => (
                              <div
                                key={idx}
                                onClick={() => setSelectedViewerProfile({ uid: vUid, displayName: "Volunteer" })}
                                className="w-5.5 h-5.5 rounded-full border-2 border-white dark:border-slate-900 bg-emerald-600 text-white text-[8px] font-black flex items-center justify-center uppercase shrink-0 cursor-pointer hover:scale-105 transition-all"
                              >
                                V
                              </div>
                            ))}
                            {drive.volunteers.length > 3 && (
                              <div className="w-5.5 h-5.5 rounded-full border border-white dark:border-slate-900 bg-slate-200 text-slate-600 text-[8px] font-black flex items-center justify-center shrink-0">
                                +{drive.volunteers.length - 3}
                              </div>
                            )}
                          </div>
                          <span className="text-[9.5px] font-black text-slate-500 dark:text-slate-400">
                            {drive.volunteers.length} {t.volunteers}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Municipal Officer certification trigger */}
                          {isStaff && !drive.isCertified && (
                            <button
                              onClick={() => handleCertify(drive.id)}
                              className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[9.5px] font-extrabold flex items-center gap-1 cursor-pointer transition-all"
                            >
                              <Award className="h-3.5 w-3.5" />
                              {t.certifyDrive}
                            </button>
                          )}

                          <button
                            onClick={() => setExpandedChatDriveId(expandedChatDriveId === drive.id ? null : drive.id)}
                            className={`px-2.5 py-1.5 text-[9.5px] font-black uppercase rounded-lg border flex items-center gap-1 cursor-pointer transition-colors ${
                              expandedChatDriveId === drive.id
                                ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                                : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600 dark:bg-slate-850 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                            }`}
                          >
                            <MessageSquare className="h-3 w-3" />
                            <span>Discussion</span>
                          </button>

                          <button
                            onClick={() => handleJoinLeave(drive.id)}
                            className={`px-3 py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider cursor-pointer shadow-sm transition-all ${
                              isVolunteering
                                ? "bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-850 dark:text-slate-200"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white"
                            }`}
                          >
                            {isVolunteering ? t.leaveBtn : t.joinBtn}
                          </button>
                        </div>
                      </div>

                      {/* Creator Profile Image & Label footer */}
                      <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-100/50 dark:border-slate-800/40 text-[9px] font-semibold text-slate-400">
                        {(drive as any).creatorPhotoURL ? (
                          <img
                            src={(drive as any).creatorPhotoURL}
                            alt={drive.creatorName}
                            referrerPolicy="no-referrer"
                            onClick={() => setSelectedViewerProfile({ uid: drive.creatorId, displayName: drive.creatorName, photoURL: (drive as any).creatorPhotoURL })}
                            className="w-5.5 h-5.5 rounded-full border border-slate-200 dark:border-slate-800 object-cover shrink-0 cursor-pointer hover:scale-105 transition-all"
                          />
                        ) : (
                          <div
                            onClick={() => setSelectedViewerProfile({ uid: drive.creatorId, displayName: drive.creatorName })}
                            className="w-5.5 h-5.5 rounded-full bg-orange-500 text-white text-[8px] font-black flex items-center justify-center uppercase shrink-0 cursor-pointer hover:scale-105 transition-all"
                          >
                            {drive.creatorName ? drive.creatorName.charAt(0).toUpperCase() : "C"}
                          </div>
                        )}
                        <div>
                          {t.creatorLabel}: <span className="font-extrabold text-emerald-600 dark:text-emerald-400 cursor-pointer hover:underline" onClick={() => setSelectedViewerProfile({ uid: drive.creatorId, displayName: drive.creatorName, photoURL: (drive as any).creatorPhotoURL })}>{drive.creatorName}</span>
                        </div>
                      </div>

                      {/* Drive Discussion & Updates Section */}
                      {expandedChatDriveId === drive.id && (
                        <DriveChatSection drive={drive} isDarkMode={isDarkMode} language={language} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Viewer Profile Modal */}
        {selectedViewerProfile && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-[99] animate-fade-in">
            <div className={`w-full max-w-sm rounded-2xl border p-5 shadow-2xl relative transition-all ${isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-100 text-slate-800"}`}>
              <button
                onClick={() => setSelectedViewerProfile(null)}
                className="absolute top-4 right-4 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex flex-col items-center text-center mt-3">
                {selectedViewerProfile.photoURL ? (
                  <img
                    src={selectedViewerProfile.photoURL}
                    alt={selectedViewerProfile.displayName}
                    referrerPolicy="no-referrer"
                    className="w-20 h-20 rounded-full border-4 border-emerald-500/25 object-cover shadow-md mb-3"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-emerald-600 text-white text-2xl font-black flex items-center justify-center mb-3 shadow-md border-4 border-emerald-500/25">
                    {selectedViewerProfile.displayName ? selectedViewerProfile.displayName.charAt(0).toUpperCase() : "U"}
                  </div>
                )}

                <h3 className="text-sm font-black tracking-tight">{selectedViewerProfile.displayName}</h3>
                <p className="text-[10px] font-bold text-slate-400 mt-0.5">SBM Volunteer ID: #{selectedViewerProfile.uid.substring(0, 8).toUpperCase()}</p>
                
                {/* Swachh Badge */}
                <div className="my-3.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/25 rounded-full flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-[9.5px] font-extrabold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                    {selectedViewerProfile.role === "staff" ? "Swachh Sanitation Officer" : "Active Eco Warrior"}
                  </span>
                </div>

                <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400 px-3 font-medium">
                  🇮🇳 Active citizen committed to the Swachh Bharat Mission. Participating in neighborhood cleanups, sorting waste, and promoting sustainable, zero-waste lifestyles across India.
                </p>

                <div className="w-full mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/60 grid grid-cols-2 gap-2 text-left">
                  <div className="bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/40">
                    <span className="text-[8px] uppercase font-bold text-slate-400 block mb-0.5">SBM Status</span>
                    <span className="text-[9.5px] font-black text-emerald-600 dark:text-emerald-400">Certified SBM Citizen</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/40">
                    <span className="text-[8px] uppercase font-bold text-slate-400 block mb-0.5">Eco Network</span>
                    <span className="text-[9.5px] font-black text-slate-600 dark:text-slate-300">Mumbai Circle</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface DriveChatSectionProps {
drive: CommunityDrive;
isDarkMode: boolean;
language: "EN" | "HI" | "MR" | "TA";
}

function DriveChatSection({ drive, isDarkMode, language }: DriveChatSectionProps) {
const { currentUser, userProfile } = useAuthHook();
const [messages, setMessages] = useState<any[]>([]);
const [newMsg, setNewMsg] = useState("");
const [loading, setLoading] = useState(true);
const [chatError, setChatError] = useState<string | null>(null);
const [isSending, setIsSending] = useState(false);
const [msgDeletingId, setMsgDeletingId] = useState<string | null>(null);

useEffect(() => {
  setChatError(null);
  setLoading(true);
  const messagesCollectionRef = collection(firestoreDb, "community_drives", drive.id, "messages");
  const q = query(messagesCollectionRef);
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const msgs: any[] = [];
    snapshot.forEach((doc) => {
      msgs.push({ id: doc.id, ...doc.data() });
    });
    msgs.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
    setMessages(msgs);
    setLoading(false);
  }, (err) => {
    console.error("Error fetching messages:", err);
    setChatError(`Failed to load messages: ${err.message || err}`);
    setLoading(false);
  });

  return () => unsubscribe();
}, [drive.id]);

const handleDeleteMessage = async (messageId: string) => {
  setChatError(null);
  try {
    const msgDocRef = doc(firestoreDb, "community_drives", drive.id, "messages", messageId);
    await deleteDoc(msgDocRef);
    setMsgDeletingId(null);
  } catch (err: any) {
    console.error("Error deleting message:", err);
    setChatError(`Failed to delete message: ${err.message || err}`);
  }
};

const handleSend = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!newMsg.trim() || !currentUser || isSending) return;

  const isCreator = currentUser.uid === drive.creatorId;
  const msgText = newMsg;
  setNewMsg("");
  setChatError(null);
  setIsSending(true);

  try {
    const messagesCollectionRef = collection(firestoreDb, "community_drives", drive.id, "messages");
    await addDoc(messagesCollectionRef, {
      senderId: currentUser.uid,
      senderName: userProfile?.displayName || currentUser.displayName || "Citizen Volunteer",
      senderPhotoURL: userProfile?.photoURL || currentUser.photoURL || "",
      text: msgText,
      createdAt: new Date().toISOString(),
      isUpdate: isCreator
    });
  } catch (err: any) {
    console.error("Error sending message:", err);
    setChatError(`Failed to send message: ${err.message || err}`);
    setNewMsg(msgText); // Restore user text so they don't lose it
  } finally {
    setIsSending(false);
  }
};

const isJoined = drive.volunteers.includes(currentUser?.uid || "");
const isCreator = currentUser?.uid === drive.creatorId;

if (!currentUser) {
  return (
    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-center text-[10px] text-slate-500 font-bold mt-3">
      Please sign in to view drive discussion.
    </div>
  );
}

return (
  <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-left">
    <div className="flex items-center justify-between mb-2">
      <h4 className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
        <span>💬 Drive Updates & Live Chat</span>
        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
      </h4>
      <span className="text-[8.5px] font-black text-slate-400 uppercase">
        {messages.length} messages
      </span>
    </div>

    {chatError && (
      <div className="p-2 mb-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[9px] font-bold text-rose-500 animate-fade-in flex flex-col gap-0.5">
        <span>⚠️ Chat connection issue:</span>
        <span className="font-mono text-[8px] font-medium opacity-90">{chatError}</span>
      </div>
    )}

    {/* Messages Box */}
    <div className="space-y-2 max-h-48 overflow-y-auto p-2 bg-slate-50/50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/40 mb-2">
      {loading ? (
        <div className="text-center py-4 text-[9px] text-slate-400 font-bold">Loading discussion...</div>
      ) : messages.length === 0 ? (
        <div className="text-center py-4 text-[9px] text-slate-400 font-bold leading-relaxed">
          📢 No updates or messages yet.<br />
          {isCreator ? "Send an update to all volunteers!" : "Join and write back to coordinate!"}
        </div>
      ) : (
        messages.map((msg) => {
          return (
            <div
              key={msg.id}
              className={`flex gap-2 p-2 rounded-lg transition-all ${
                msg.isUpdate
                  ? "bg-amber-500/10 border border-amber-500/20 text-slate-800 dark:text-amber-100"
                  : "bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800/40"
              }`}
            >
              {msg.senderPhotoURL ? (
                <img
                  src={msg.senderPhotoURL}
                  alt={msg.senderName}
                  referrerPolicy="no-referrer"
                  className="w-5.5 h-5.5 rounded-full object-cover border border-slate-100 dark:border-slate-800 shrink-0"
                />
              ) : (
                <div className="w-5.5 h-5.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[8px] font-black flex items-center justify-center uppercase shrink-0 border border-emerald-500/20">
                  {msg.senderName ? msg.senderName.charAt(0) : "V"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[9.5px] font-extrabold text-slate-700 dark:text-slate-300 truncate">
                      {msg.senderName}
                    </span>
                    {msg.isUpdate && (
                      <span className="text-[7.5px] font-black uppercase text-amber-600 dark:text-amber-400 border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 rounded shrink-0">
                        📢 Official Update
                      </span>
                    )}
                  </div>

                  {/* Message Deletion Option */}
                  {(msg.senderId === currentUser?.uid || drive.creatorId === currentUser?.uid) && (
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {msgDeletingId === msg.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="text-rose-600 dark:text-rose-400 hover:underline text-[7.5px] font-extrabold uppercase px-1 rounded bg-rose-500/10 cursor-pointer"
                          >
                            Del
                          </button>
                          <button
                            type="button"
                            onClick={() => setMsgDeletingId(null)}
                            className="text-slate-500 dark:text-slate-400 hover:underline text-[7.5px] font-extrabold uppercase px-1 rounded bg-slate-100 dark:bg-slate-800 cursor-pointer"
                          >
                            X
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setMsgDeletingId(msg.id)}
                          className="text-slate-400 hover:text-rose-500 p-0.5 rounded transition-colors cursor-pointer"
                          title="Delete message/announcement"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-[9.5px] leading-relaxed mt-0.5 text-slate-600 dark:text-slate-300 break-words font-medium font-sans">
                  {msg.text}
                </p>
              </div>
            </div>
          );
        })
      )}
    </div>

    {/* Input Form */}
    {isJoined || isCreator ? (
      <form onSubmit={handleSend} className="flex gap-1.5">
        <input
          type="text"
          value={newMsg}
          disabled={isSending}
          onChange={(e) => setNewMsg(e.target.value)}
          placeholder={
            isSending
              ? "Sending..."
              : isCreator
              ? "📢 Broadcast an official update..."
              : "💬 Reply or ask a question..."
          }
          className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[9.5px] font-semibold text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 animate-fade-in disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isSending || !newMsg.trim()}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9.5px] font-black uppercase tracking-wider shrink-0 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSending ? "..." : "Send"}
        </button>
      </form>
    ) : (
      <div className="p-2 bg-slate-50/60 dark:bg-slate-900/50 rounded-lg text-center text-[8.5px] text-slate-400 font-extrabold border border-slate-100/50 dark:border-slate-800/30">
        🔒 Join this Swachh Drive to participate in the conversation.
      </div>
    )}
  </div>
);
}
