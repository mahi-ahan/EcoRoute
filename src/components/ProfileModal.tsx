import React, { useState, useRef, ChangeEvent } from "react";
import { Camera, User, Globe, Image as ImageIcon, Sparkles, Check, X, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: "EN" | "HI" | "MR" | "TA";
  isDarkMode?: boolean;
}

const translations = {
  EN: {
    title: "Complete Your Swachh Profile",
    subtitle: "Personalize your identity across the Swachh Bharat EcoRoute network.",
    nameLabel: "Your Display Name",
    namePlaceholder: "e.g., Aarav Sharma",
    photoLabel: "Profile Picture",
    optionUpload: "Upload Photo",
    optionUrl: "Image URL",
    optionAvatars: "Select Eco Avatar",
    urlLabel: "Paste Image URL",
    urlPlaceholder: "https://example.com/photo.jpg",
    saveBtn: "Save Profile Changes",
    cancelBtn: "Cancel",
    saving: "Syncing changes...",
    success: "Profile updated successfully! 🇮🇳",
    uploadPlaceholder: "Click to upload your profile photo",
    compressing: "Optimizing image...",
  },
  HI: {
    title: "अपनी स्वच्छ प्रोफ़ाइल पूरी करें",
    subtitle: "स्वच्छ भारत इकोरूट नेटवर्क पर अपनी पहचान को वैयक्तिकृत करें।",
    nameLabel: "आपका नाम",
    namePlaceholder: "जैसे, आरव शर्मा",
    photoLabel: "प्रोफ़ाइल चित्र",
    optionUpload: "फोटो अपलोड करें",
    optionUrl: "छवि यूआरएल",
    optionAvatars: "इको अवतार चुनें",
    urlLabel: "छवि यूआरएल पेस्ट करें",
    urlPlaceholder: "https://example.com/photo.jpg",
    saveBtn: "प्रोफ़ाइल सहेजें",
    cancelBtn: "रद्द करें",
    saving: "सिंक हो रहा है...",
    success: "प्रोफ़ाइल सफलतापूर्वक अपडेट की गई! 🇮🇳",
    uploadPlaceholder: "अपनी प्रोफ़ाइल फ़ोटो अपलोड करने के लिए क्लिक करें",
    compressing: "छवि को अनुकूलित किया जा रहा है...",
  },
  MR: {
    title: "तुमची स्वच्छ प्रोफाइल पूर्ण करा",
    subtitle: "स्वच्छ भारत इकोरूट नेटवर्कवर तुमची ओळख तयार करा.",
    nameLabel: "तुमचे नाव",
    namePlaceholder: "उदा., आरव शर्मा",
    photoLabel: "प्रोफाइल फोटो",
    optionUpload: "फोटो अपलोड करा",
    optionUrl: "फोटो लिंक (URL)",
    optionAvatars: "इको अवतार निवडा",
    urlLabel: "फोटो लिंक पेस्ट करा",
    urlPlaceholder: "https://example.com/photo.jpg",
    saveBtn: "बदल जतन करा",
    cancelBtn: "रद्द करा",
    saving: "जतन होत आहे...",
    success: "प्रोफाइल यशस्वीरित्या अपडेट झाली! 🇮🇳",
    uploadPlaceholder: "तुमचा प्रोफाइल फोटो अपलोड करण्यासाठी क्लिक करा",
    compressing: "फोटो ऑप्टिमाइझ करत आहे...",
  },
  TA: {
    title: "உங்கள் சுவச் சுயவிவரத்தை முடிக்கவும்",
    subtitle: "சுவச் பாரத் எகோரூட் நெட்வொர்க்கில் உங்கள் அடையாளத்தை மாற்றியமைக்கவும்.",
    nameLabel: "உங்கள் பெயர்",
    namePlaceholder: "எ.கா., ஆரவ் சர்மா",
    photoLabel: "சுயவிவரப் படம்",
    optionUpload: "படம் பதிвеற்று",
    optionUrl: "வலைப்பக்க முகவரி",
    optionAvatars: "சுயவிவர சின்னத்தை தேர்ந்தெடு",
    urlLabel: "படம் வலைப்பக்க முகவரியை ஒட்டவும்",
    urlPlaceholder: "https://example.com/photo.jpg",
    saveBtn: "சுயவிவரத்தை சேமி",
    cancelBtn: "ரத்து செய்",
    saving: "சேமிக்கப்படுகிறது...",
    success: "சுயவிவரம் வெற்றிகரமாக புதுப்பிக்கப்பட்டது! 🇮🇳",
    uploadPlaceholder: "சுயவிவரப் புகைப்படத்தைப் பதிவேற்ற கிளிக் செய்யவும்",
    compressing: "படம் மேம்படுத்தப்படுகிறது...",
  }
};

const ECO_AVATARS = [
  { name: "Earth Guardian", url: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=150" },
  { name: "Eco Warrior", url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=150" },
  { name: "Swachh Volunteer", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150" },
  { name: "Green Leader", url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=150" },
  { name: "Clean Streets Officer", url: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=150" },
];

export default function ProfileModal({
  isOpen,
  onClose,
  language = "EN",
  isDarkMode = false
}: ProfileModalProps) {
  const { currentUser, userProfile, updateProfileData } = useAuth();
  const t = translations[language] || translations.EN;

  const [displayName, setDisplayName] = useState(userProfile?.displayName || currentUser?.displayName || "");
  const [photoMode, setPhotoMode] = useState<"upload" | "url" | "avatar">("avatar");
  const [photoURL, setPhotoURL] = useState(userProfile?.photoURL || currentUser?.photoURL || "");
  const [customUrl, setCustomUrl] = useState(userProfile?.photoURL?.startsWith("http") ? userProfile.photoURL : "");
  
  const [isSaving, setIsSaving] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !currentUser) return null;

  // Base64 Image Compression
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 150;
          const MAX_HEIGHT = 150;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          
          const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsCompressing(true);
      setErrorMsg(null);
      try {
        const compressed = await compressImage(e.target.files[0]);
        setPhotoURL(compressed);
        setSuccessMsg(null);
      } catch (err) {
        setErrorMsg("Failed to process profile image.");
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setErrorMsg("Display Name cannot be empty.");
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      let finalPhotoURL = photoURL;
      if (photoMode === "url") {
        finalPhotoURL = customUrl.trim();
      }

      await updateProfileData({
        displayName: displayName.trim(),
        photoURL: finalPhotoURL || undefined,
      });

      setSuccessMsg(t.success);
      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
      }, 1500);
    } catch (err) {
      console.error(err);
      setErrorMsg("An error occurred while updating profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[999] animate-fadeIn">
      <div className={`w-full max-w-md rounded-2xl border p-6 flex flex-col shadow-2xl ${isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-100 text-slate-800"}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4 border-b pb-3 border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg text-emerald-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-tight">{t.title}</h3>
              <p className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">{t.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4">
          
          {/* Status Message */}
          {successMsg && (
            <div className="p-2.5 rounded-lg text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-center flex items-center justify-center gap-1.5">
              <Check className="h-4 w-4" />
              {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="p-2.5 rounded-lg text-xs font-bold bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-center">
              {errorMsg}
            </div>
          )}

          {/* User Role Badge */}
          <div className="flex items-center justify-center gap-3 py-2 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-150/40 dark:border-slate-850/60">
            {photoURL ? (
              <img
                src={photoURL}
                alt="Profile Preview"
                className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500 shadow-md bg-white dark:bg-slate-900"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center border-2 border-emerald-500 shadow-md">
                <User className="h-8 w-8" />
              </div>
            )}
            <div className="text-left">
              <div className="text-xs font-black text-slate-700 dark:text-slate-200">
                {displayName || "Unnamed Swachh Leader"}
              </div>
              <div className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                <Globe className="h-3 w-3" />
                SBM {userProfile?.role || "Citizen"} Profile
              </div>
            </div>
          </div>

          {/* Display Name Field */}
          <div className="space-y-1">
            <label className="text-[9.5px] font-black uppercase tracking-wider block text-slate-500 dark:text-slate-400">
              {t.nameLabel}
            </label>
            <input
              type="text"
              required
              placeholder={t.namePlaceholder}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={`w-full text-xs px-3 py-2 rounded-lg border font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/25 ${
                isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-250 text-slate-800"
              }`}
            />
          </div>

          {/* Photo Source Toggles */}
          <div className="space-y-1">
            <label className="text-[9.5px] font-black uppercase tracking-wider block text-slate-500 dark:text-slate-400">
              {t.photoLabel}
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-50 dark:bg-slate-950/30 border border-slate-200/40 dark:border-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setPhotoMode("avatar")}
                className={`py-1.5 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer ${
                  photoMode === "avatar"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                }`}
              >
                {t.optionAvatars}
              </button>
              <button
                type="button"
                onClick={() => setPhotoMode("upload")}
                className={`py-1.5 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer ${
                  photoMode === "upload"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                }`}
              >
                {t.optionUpload}
              </button>
              <button
                type="button"
                onClick={() => setPhotoMode("url")}
                className={`py-1.5 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer ${
                  photoMode === "url"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                }`}
              >
                {t.optionUrl}
              </button>
            </div>
          </div>

          {/* Photo source specific panels */}
          {photoMode === "avatar" && (
            <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
              <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
                {ECO_AVATARS.map((avatar, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPhotoURL(avatar.url)}
                    className={`relative rounded-full overflow-hidden shrink-0 border-2 transition-all cursor-pointer hover:scale-105 ${
                      photoURL === avatar.url ? "border-emerald-600 scale-105" : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={avatar.url} alt={avatar.name} className="w-10 h-10 object-cover" referrerPolicy="no-referrer" />
                    {photoURL === avatar.url && (
                      <div className="absolute inset-0 bg-emerald-600/30 flex items-center justify-center">
                        <Check className="h-4 w-4 text-white font-black" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {photoMode === "upload" && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-emerald-500/25 rounded-xl p-4 text-center cursor-pointer hover:bg-emerald-500/[0.03] transition-all bg-emerald-500/[0.01]"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                onClick={(e) => e.stopPropagation()}
                className="hidden"
                accept="image/*"
              />
              {isCompressing ? (
                <div className="flex flex-col items-center gap-1">
                  <Loader2 className="h-5 w-5 text-emerald-500 animate-spin" />
                  <span className="text-[10px] font-bold text-slate-500">{t.compressing}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <Camera className="h-5 w-5 text-emerald-500" />
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{t.uploadPlaceholder}</span>
                  <span className="text-[9px] text-slate-400">Supports JPEG/PNG</span>
                </div>
              )}
            </div>
          )}

          {photoMode === "url" && (
            <div className="space-y-1 animate-fadeIn">
              <label className="text-[9px] font-black uppercase tracking-wider block text-slate-500 dark:text-slate-400">
                {t.urlLabel}
              </label>
              <input
                type="url"
                placeholder={t.urlPlaceholder}
                value={customUrl}
                onChange={(e) => {
                  setCustomUrl(e.target.value);
                  setPhotoURL(e.target.value);
                }}
                className={`w-full text-xs px-3 py-2 rounded-lg border font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/25 ${
                  isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-250 text-slate-800"
                }`}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              disabled={isSaving || isCompressing}
              className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isSaving ? t.saving : t.saveBtn}
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 text-xs font-black rounded-xl border transition-all cursor-pointer ${
                isDarkMode ? "bg-slate-800 border-slate-750 text-slate-300 hover:bg-slate-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {t.cancelBtn}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
