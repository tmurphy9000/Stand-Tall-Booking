import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const booking = payload.data;

    // Only send confirmation for new bookings (not updates)
    if (payload.event.type !== 'create' || !booking.client_email) {
      return Response.json({ success: true, skipped: true });
    }

    const subject = `Appointment Confirmed - ${booking.service_name}`;
    const body = `Hi ${booking.client_name || 'there'},\n\nYour appointment has been confirmed!\n\nDetails:\nDate: ${booking.date}\nTime: ${booking.start_time}\nService: ${booking.service_name}\nBarber: ${booking.barber_name}\nPrice: $${booking.price}\n\nIf you need to reschedule or cancel, please contact us.\n\nThank you!`;

    await base44.integrations.Core.SendEmail({
      to: booking.client_email,
      subject,
      body
    });

    return Response.json({ success: true, emailSent: true });
  } catch (error) {
    console.error('Error in sendBookingConfirmation:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});