import React, { useState, useRef, useEffect, useCallback } from "react";
import { entities } from "@/api/entities";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function NotificationBell({ userEmail, userType = "staff", navStyle = false }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  // Two-tap label state for icon-only (non-navStyle) bell on touch devices
  const [tapLabel, setTapLabel] = useState(false);
  const [tapLabelStyle, setTapLabelStyle] = useState(null);
  const triggerRef = useRef(null);
  const isTouchRef = useRef(false);

  useEffect(() => {
    if (!tapLabel) return;
    const dismiss = (e) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target)) setTapLabel(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [tapLabel]);

  const handleBellPointerDown = useCallback((e) => {
    if (e.pointerType === 'touch') isTouchRef.current = true;
  }, []);

  const handleBellClick = useCallback((e) => {
    if (!isTouchRef.current) return; // desktop: Radix opens popover normally
    if (!tapLabel) {
      // First touch tap: show label, block popover from opening
      e.preventDefault();
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setTapLabelStyle({
          position: 'fixed',
          top: rect.top,
          left: rect.left + rect.width / 2,
          transform: 'translate(-50%, calc(-100% - 8px))',
          zIndex: 300,
        });
      }
      setTapLabel(true);
    } else {
      // Second touch tap: dismiss label, let Radix open popover
      setTapLabel(false);
    }
  }, [tapLabel]);

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      return await entities.Notification.filter(
        { recipient_email: userEmail, recipient_type: userType },
        "-created_date"
      );
    },
    enabled: !!userEmail,
  });

  const markAsRead = useMutation({
    mutationFn: (id) => entities.Notification.update(id, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.is_read);
      await Promise.all(unread.map(n => entities.Notification.update(n.id, { is_read: true })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {navStyle ? (
          <button className="flex flex-col items-center gap-1 py-2 px-2 transition-all w-full text-[#FAFAF8]/60 hover:text-[#FAFAF8]/90 hover:bg-card/10 rounded-lg">
            <span className="relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </span>
            <span className="text-[9px] font-medium text-center leading-tight">Alerts</span>
          </button>
        ) : (
          <Button
            ref={triggerRef}
            variant="ghost"
            size="icon"
            className="relative"
            onPointerDown={handleBellPointerDown}
            onClick={handleBellClick}
          >
            {tapLabel && tapLabelStyle && (
              <div
                role="tooltip"
                style={tapLabelStyle}
                className="px-2.5 py-1 bg-gray-900 text-white text-xs font-medium rounded-md whitespace-nowrap shadow-lg pointer-events-none select-none"
              >
                Notifications
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-[5px] border-transparent border-t-gray-900" />
              </div>
            )}
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b flex items-center justify-between">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllRead.mutate()}
              className="text-xs h-7"
            >
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No notifications</p>
          ) : (
            notifications.map(notification => (
              <div
                key={notification.id}
                className={`p-3 border-b hover:bg-accent cursor-pointer ${
                  !notification.is_read ? "bg-blue-50/30" : ""
                }`}
                onClick={() => !notification.is_read && markAsRead.mutate(notification.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{notification.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.created_date), { addSuffix: true })}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}