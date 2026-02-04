'use client';

import { useState, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import { fr, enCA } from 'date-fns/locale';
import { Calendar, Clock, Check, AlertCircle } from 'lucide-react';

interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

interface BookingPageProps {
  searchParams: { order_id?: string; lang?: 'fr' | 'en' };
}

const translations = {
  fr: {
    title: 'Réserver un rendez-vous',
    subtitle: 'Choisissez une date et une heure pour votre essayage',
    selectDate: 'Sélectionnez une date',
    selectTime: 'Sélectionnez une heure',
    noSlots: 'Aucun créneau disponible pour cette date',
    book: 'Réserver',
    booking: 'Réservation en cours...',
    success: 'Rendez-vous confirmé!',
    successMessage: 'Vous recevrez une confirmation par SMS.',
    error: 'Une erreur est survenue',
    tryAgain: 'Veuillez réessayer',
    notes: 'Notes additionnelles (optionnel)',
    notesPlaceholder: 'Informations supplémentaires pour votre rendez-vous...',
  },
  en: {
    title: 'Book an Appointment',
    subtitle: 'Choose a date and time for your fitting',
    selectDate: 'Select a date',
    selectTime: 'Select a time',
    noSlots: 'No available slots for this date',
    book: 'Book',
    booking: 'Booking...',
    success: 'Appointment Confirmed!',
    successMessage: 'You will receive a confirmation by SMS.',
    error: 'An error occurred',
    tryAgain: 'Please try again',
    notes: 'Additional notes (optional)',
    notesPlaceholder: 'Additional information for your appointment...',
  },
};

export default function BookingPage({ searchParams }: BookingPageProps) {
  const lang = searchParams.lang || 'fr';
  const t = translations[lang];
  const locale = lang === 'fr' ? fr : enCA;

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const dates = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(new Date(), i + 1);
    if (date.getDay() === 0) return null;
    return format(date, 'yyyy-MM-dd');
  }).filter(Boolean) as string[];

  useEffect(() => {
    if (!selectedDate) return;

    const fetchSlots = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/calendar/slots?date=${selectedDate}&duration=60`);
        const data = await res.json();
        if (data.error) {
          setError(data.error);
          setSlots([]);
        } else {
          setSlots(data.slots || []);
        }
      } catch {
        setError(t.error);
        setSlots([]);
      }
      setLoading(false);
    };

    fetchSlots();
  }, [selectedDate, t.error]);

  const handleBook = async () => {
    if (!selectedSlot || !searchParams.order_id) return;

    setBooking(true);
    setError(null);

    try {
      const res = await fetch('/api/calendar/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: searchParams.order_id,
          start_time: selectedSlot.start,
          end_time: selectedSlot.end,
          notes,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setSuccess(true);
      }
    } catch {
      setError(t.error);
    }

    setBooking(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-muted/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{t.success}</h1>
          <p className="text-muted-foreground">{t.successMessage}</p>
          {selectedSlot && (
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <p className="font-medium text-foreground">
                {format(new Date(selectedSlot.start), 'EEEE d MMMM yyyy', { locale })}
              </p>
              <p className="text-muted-foreground">
                {format(new Date(selectedSlot.start), 'HH:mm')} - {format(new Date(selectedSlot.end), 'HH:mm')}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-muted/50">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-4 md:p-8">
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{t.title}</h1>
            <p className="text-muted-foreground">{t.subtitle}</p>
          </div>

          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <h2 className="font-semibold text-foreground">{t.selectDate}</h2>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
              {dates.map(date => (
                <button
                  key={date}
                  onClick={() => {
                    setSelectedDate(date);
                    setSelectedSlot(null);
                  }}
                  className={`p-3 rounded-lg text-center transition-all ${
                    selectedDate === date
                      ? 'bg-black text-white'
                      : 'bg-muted hover:bg-accent text-foreground'
                  }`}
                >
                  <div className="text-xs uppercase">
                    {format(new Date(date), 'EEE', { locale })}
                  </div>
                  <div className="text-lg font-semibold">
                    {format(new Date(date), 'd')}
                  </div>
                  <div className="text-xs">
                    {format(new Date(date), 'MMM', { locale })}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selectedDate && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <h2 className="font-semibold text-foreground">{t.selectTime}</h2>
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                </div>
              ) : slots.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">{t.noSlots}</p>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                  {slots.map(slot => (
                    <button
                      key={slot.start}
                      onClick={() => setSelectedSlot(slot)}
                      className={`p-3 rounded-lg text-center transition-all ${
                        selectedSlot?.start === slot.start
                          ? 'bg-black text-white'
                          : 'bg-muted hover:bg-accent text-foreground'
                      }`}
                    >
                      {format(new Date(slot.start), 'HH:mm')}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedSlot && (
            <div className="mb-8">
              <label className="block text-sm font-medium text-foreground mb-2">
                {t.notes}
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={t.notesPlaceholder}
                className="w-full p-3 border rounded-lg resize-none h-24 focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-red-800 font-medium">{t.error}</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          )}

          <button
            onClick={handleBook}
            disabled={!selectedSlot || booking || !searchParams.order_id}
            className="w-full py-4 bg-black text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-foreground/90 transition-colors"
          >
            {booking ? t.booking : t.book}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
