import { google, calendar_v3 } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export function getAuthUrl(): string {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ],
    prompt: 'consent',
  });
}

export async function getTokensFromCode(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expiry_date: number;
}> {
  const { tokens } = await oauth2Client.getToken(code);
  return {
    access_token: tokens.access_token!,
    refresh_token: tokens.refresh_token!,
    expiry_date: tokens.expiry_date!,
  };
}

export function setCredentials(tokens: {
  access_token: string;
  refresh_token: string;
}): void {
  oauth2Client.setCredentials(tokens);
}

function getCalendar(): calendar_v3.Calendar {
  return google.calendar({ version: 'v3', auth: oauth2Client });
}

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

export interface BookingDetails {
  clientName: string;
  clientPhone: string;
  clientEmail?: string | undefined;
  orderNumber: number;
  notes?: string | undefined;
  language: 'fr' | 'en';
}

export async function getAvailableSlots(
  date: string,
  durationMinutes: number = 60
): Promise<TimeSlot[]> {
  const calendar = getCalendar();
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

  const startOfDay = new Date(date);
  startOfDay.setHours(9, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(18, 0, 0, 0);

  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      items: [{ id: calendarId }],
    },
  });

  const busySlots = response.data.calendars?.[calendarId]?.busy || [];

  const slots: TimeSlot[] = [];
  const slotDuration = durationMinutes * 60 * 1000;
  let currentTime = startOfDay.getTime();

  while (currentTime + slotDuration <= endOfDay.getTime()) {
    const slotStart = new Date(currentTime);
    const slotEnd = new Date(currentTime + slotDuration);

    const isAvailable = !busySlots.some(busy => {
      const busyStart = new Date(busy.start!).getTime();
      const busyEnd = new Date(busy.end!).getTime();
      return currentTime < busyEnd && currentTime + slotDuration > busyStart;
    });

    slots.push({
      start: slotStart.toISOString(),
      end: slotEnd.toISOString(),
      available: isAvailable,
    });

    currentTime += 30 * 60 * 1000;
  }

  return slots;
}

export async function createBooking(
  startTime: string,
  endTime: string,
  booking: BookingDetails
): Promise<{ eventId: string; htmlLink: string }> {
  const calendar = getCalendar();
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

  const title =
    booking.language === 'fr'
      ? `Rendez-vous - ${booking.clientName} (#${booking.orderNumber})`
      : `Appointment - ${booking.clientName} (#${booking.orderNumber})`;

  const description =
    booking.language === 'fr'
      ? `Client: ${booking.clientName}
Téléphone: ${booking.clientPhone}
${booking.clientEmail ? `Email: ${booking.clientEmail}` : ''}
Commande: #${booking.orderNumber}
${booking.notes ? `Notes: ${booking.notes}` : ''}`
      : `Client: ${booking.clientName}
Phone: ${booking.clientPhone}
${booking.clientEmail ? `Email: ${booking.clientEmail}` : ''}
Order: #${booking.orderNumber}
${booking.notes ? `Notes: ${booking.notes}` : ''}`;

  const response = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: title,
      description,
      start: {
        dateTime: startTime,
        timeZone: 'America/Toronto',
      },
      end: {
        dateTime: endTime,
        timeZone: 'America/Toronto',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 60 },
        ],
      },
    },
  });

  return {
    eventId: response.data.id!,
    htmlLink: response.data.htmlLink!,
  };
}

export async function cancelBooking(eventId: string): Promise<void> {
  const calendar = getCalendar();
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

  await calendar.events.delete({
    calendarId,
    eventId,
  });
}

export async function updateBooking(
  eventId: string,
  startTime: string,
  endTime: string
): Promise<void> {
  const calendar = getCalendar();
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

  await calendar.events.patch({
    calendarId,
    eventId,
    requestBody: {
      start: {
        dateTime: startTime,
        timeZone: 'America/Toronto',
      },
      end: {
        dateTime: endTime,
        timeZone: 'America/Toronto',
      },
    },
  });
}
