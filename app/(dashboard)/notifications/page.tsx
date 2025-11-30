'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Notification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (id?: string) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        // Refresh data to update UI and navbar badge
        fetchNotifications();
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to mark as read', error);
    }
  };

  if (isLoading) return <div className="p-8 text-center">Loading notifications...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-primary">Notifications</h1>
        {notifications.some(n => !n.isRead) && (
          <button
            onClick={() => markAsRead()}
            className="text-sm text-primary hover:underline"
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="space-y-4">
        {notifications.length === 0 ? (
          <div className="bg-card shadow rounded-lg p-6 text-center text-muted-foreground border border-border">
            No notifications found.
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-card shadow rounded-lg p-6 border border-border transition-colors ${
                !notification.isRead ? 'border-l-4 border-l-primary bg-primary/5' : ''
              }`}
              onClick={() => !notification.isRead && markAsRead(notification.id)}
            >
              <div className="flex justify-between items-start">
                <h3 className={`text-lg font-semibold ${!notification.isRead ? 'text-primary' : 'text-foreground'}`}>
                  {notification.title}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {new Date(notification.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="mt-2 text-muted-foreground whitespace-pre-wrap">{notification.message}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}