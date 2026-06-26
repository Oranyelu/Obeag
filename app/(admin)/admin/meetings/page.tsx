'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const meetingSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  date: z.string().min(1, 'Meeting date and time is required'),
  location: z.string().min(1, 'Location is required'),
});

type MeetingFormData = z.infer<typeof meetingSchema>;

interface Meeting {
  id: string;
  title: string;
  description?: string;
  date: string;
  location?: string;
}

export default function AdminMeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<MeetingFormData>({
    resolver: zodResolver(meetingSchema),
  });

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      const res = await fetch('/api/admin/meetings');
      if (res.ok) {
        const data = await res.json();
        setMeetings(data);
      }
    } catch (error) {
      console.error('Error fetching meetings', error);
    } finally {
      setFetching(false);
    }
  };

  const onSubmit = async (data: MeetingFormData) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (res.ok) {
        reset();
        fetchMeetings(); // Reload
        alert('Meeting scheduled successfully!');
      } else {
        alert(result.error || 'Failed to schedule meeting');
      }
    } catch (error) {
      console.error('Error scheduling meeting', error);
      alert('An error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const upcomingMeetings = meetings.filter(m => new Date(m.date) >= new Date());
  const pastMeetings = meetings.filter(m => new Date(m.date) < new Date());

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-primary">Manage Meetings</h1>
        <p className="text-muted-foreground">Schedule new meetings and view meeting history.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Form Column */}
        <div className="lg:col-span-1">
          <div className="bg-card p-6 rounded-xl shadow-md border border-border sticky top-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Schedule a Meeting</h2>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Meeting Title</label>
                <input
                  type="text"
                  placeholder="e.g. Monthly General Meeting"
                  {...register('title')}
                  className="w-full rounded-lg border border-input bg-background text-foreground text-sm p-2 focus:ring-1 focus:ring-primary focus:outline-none"
                />
                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Date & Time</label>
                <input
                  type="datetime-local"
                  {...register('date')}
                  className="w-full rounded-lg border border-input bg-background text-foreground text-sm p-2 focus:ring-1 focus:ring-primary focus:outline-none"
                />
                {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Location</label>
                <input
                  type="text"
                  placeholder="e.g. Town Hall or Zoom Link"
                  {...register('location')}
                  className="w-full rounded-lg border border-input bg-background text-foreground text-sm p-2 focus:ring-1 focus:ring-primary focus:outline-none"
                />
                {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Description (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Agenda details..."
                  {...register('description')}
                  className="w-full rounded-lg border border-input bg-background text-foreground text-sm p-2 focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary text-primary-foreground font-semibold py-2 px-4 rounded-lg hover:opacity-90 transition disabled:opacity-50"
              >
                {isLoading ? 'Scheduling...' : 'Schedule Meeting'}
              </button>
            </form>
          </div>
        </div>

        {/* List Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Upcoming Meetings */}
          <div className="bg-card p-6 rounded-xl shadow-md border border-border">
            <h2 className="text-xl font-bold text-foreground mb-4">Upcoming Meetings</h2>
            {fetching ? (
              <p className="text-sm text-muted-foreground">Loading meetings...</p>
            ) : upcomingMeetings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming meetings scheduled.</p>
            ) : (
              <div className="space-y-4">
                {upcomingMeetings.map((meeting) => (
                  <div key={meeting.id} className="p-4 bg-muted/30 border border-border rounded-lg space-y-2">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-primary">{meeting.title}</h3>
                      <span className="text-xs font-medium bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full">
                        Scheduled
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>🕒 {new Date(meeting.date).toLocaleString()}</div>
                      <div>📍 {meeting.location || 'No location set'}</div>
                    </div>
                    {meeting.description && (
                      <p className="text-xs text-foreground bg-card p-2 rounded border border-border/40 mt-2">
                        {meeting.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past Meetings */}
          <div className="bg-card p-6 rounded-xl shadow-md border border-border">
            <h2 className="text-xl font-bold text-foreground mb-4">Past Meetings</h2>
            {fetching ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : pastMeetings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No meeting history.</p>
            ) : (
              <div className="space-y-3">
                {pastMeetings.map((meeting) => (
                  <div key={meeting.id} className="flex justify-between items-center text-sm p-3 bg-muted/20 rounded-lg">
                    <div>
                      <div className="font-medium text-foreground">{meeting.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(meeting.date).toLocaleDateString()} &bull; {meeting.location}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">Concluded</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
