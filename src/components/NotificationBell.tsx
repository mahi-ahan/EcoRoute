import { useState, useEffect, useRef, MouseEvent } from "react";
import { Bell, BellRing, Check, CheckSquare, Trash2, Mail, Info, Clock } from "lucide-react";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { AppNotification } from "../types";

interface NotificationBellProps {
  onSelectReport: (reportId: string) => void;
}

export default function NotificationBell({ onSelectReport }: NotificationBellProps) {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load real-time notifications for the current user
  useEffect(() => {
    if (!currentUser) return;

    const notifRef = collection(db, "notifications");
    const q = query(
      notifRef,
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: AppNotification[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          list.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
          } as AppNotification);
        });
        setNotifications(list);
      },
      (err) => {
        // Silently catch permission-denied / other subscription errors (e.g. during logout)
        console.warn("Notification listener closed or failed:", err);
      }
    );

    return unsubscribe;
  }, [currentUser]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = async (notifId: string, e: MouseEvent) => {
    e.stopPropagation();
    try {
      const docRef = doc(db, "notifications", notifId);
      await updateDoc(docRef, { read: true });
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (notifications.length === 0) return;
    try {
      const batch = writeBatch(db);
      notifications.forEach((n) => {
        if (!n.read) {
          const docRef = doc(db, "notifications", n.id);
          batch.update(docRef, { read: true });
        }
      });
      await batch.commit();
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
    }
  };

  const handleClearAll = async () => {
    if (notifications.length === 0) return;
    if (!confirm("Are you sure you want to clear all notifications?")) return;
    try {
      const batch = writeBatch(db);
      notifications.forEach((n) => {
        const docRef = doc(db, "notifications", n.id);
        batch.delete(docRef);
      });
      await batch.commit();
      setIsOpen(false);
    } catch (err) {
      console.error("Error clearing notifications:", err);
    }
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    // Select the related report
    onSelectReport(notif.reportId);
    setIsOpen(false);

    // Mark as read if not already
    if (!notif.read) {
      try {
        const docRef = doc(db, "notifications", notif.id);
        await updateDoc(docRef, { read: true });
      } catch (err) {
        console.error("Error updating notification status:", err);
      }
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger */}
      <button
        id="notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-xl border transition-all cursor-pointer relative flex items-center justify-center ${
          isOpen 
            ? "bg-emerald-50 border-emerald-200 text-emerald-600" 
            : "bg-white hover:bg-slate-50 border-slate-200 text-slate-500"
        }`}
        title="Notifications"
      >
        {unreadCount > 0 ? (
          <>
            <BellRing className="h-4 w-4 text-emerald-600 animate-swing" />
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-bold text-[9px] h-4 min-w-4 px-1 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
              {unreadCount}
            </span>
          </>
        ) : (
          <Bell className="h-4 w-4" />
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          id="notification-dropdown"
          className="absolute right-0 mt-2.5 w-80 sm:w-96 bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden flex flex-col max-h-[450px]"
        >
          {/* Header */}
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[10px] text-emerald-600 font-semibold">{unreadCount} unread message(s)</span>
              )}
            </div>
            {notifications.length > 0 && (
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-[10px] font-bold text-slate-500 hover:text-emerald-600 flex items-center gap-0.5"
                    title="Mark all as read"
                  >
                    <CheckSquare className="h-3 w-3" />
                    Read All
                  </button>
                )}
                <button
                  onClick={handleClearAll}
                  className="text-[10px] font-bold text-slate-500 hover:text-rose-600 flex items-center gap-0.5"
                  title="Clear all"
                >
                  <Trash2 className="h-3 w-3" />
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center text-slate-400">
                <Info className="h-8 w-8 text-slate-200 mb-2" />
                <p className="text-xs font-bold text-slate-500">All caught up!</p>
                <p className="text-[10px] text-slate-400 max-w-[200px] mt-0.5">
                  You'll see in-app updates when staff processes your reports.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 transition-all cursor-pointer hover:bg-slate-50 flex items-start gap-3 relative ${
                    !notif.read ? "bg-emerald-50/15" : ""
                  }`}
                >
                  {/* Unread Indicator Dot */}
                  {!notif.read && (
                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  )}

                  <div className="flex-1 min-w-0 pl-1">
                    <p className="text-[11px] font-semibold text-slate-700 leading-normal">
                      {notif.message}
                    </p>
                    
                    <div className="flex items-center justify-between mt-2 text-[9px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {notif.emailSent && (
                        <span className="flex items-center gap-0.5 text-slate-500 font-medium bg-slate-100 px-1 py-0.5 rounded">
                          <Mail className="h-2.5 w-2.5 text-emerald-500 shrink-0" />
                          Email sent
                        </span>
                      )}
                    </div>
                  </div>

                  {!notif.read && (
                    <button
                      onClick={(e) => handleMarkAsRead(notif.id, e)}
                      className="p-1 text-slate-300 hover:text-emerald-600 rounded"
                      title="Mark as read"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
