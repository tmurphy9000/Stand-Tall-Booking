import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all bookings
    const allBookings = await base44.entities.Booking.list('-date', 1000);
    
    // Get all clients
    const allClients = await base44.entities.Client.list('', 1000);

    // Get today's date
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Tomorrow's date (for 24-hour reminder)
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Find appointments scheduled for tomorrow
    const tomorrowBookings = allBookings.filter(booking => 
      booking.date === tomorrowStr && 
      (booking.status === 'scheduled' || booking.status === 'confirmed')
    );

    let remindersSent = 0;

    // Send reminders to each client
    for (const booking of tomorrowBookings) {
      // Get client info
      const client = allClients.find(c => c.id === booking.client_id);
      
      if (client && client.email) {
        try {
          await base44.integrations.Core.SendEmail({
            to: client.email,
            subject: `Appointment Reminder - ${booking.service_name}`,
            body: `Hi ${client.name || 'there'},\n\nThis is a reminder about your appointment tomorrow at ${booking.start_time} with ${booking.barber_name} for ${booking.service_name}.\n\nIf you need to reschedule, please contact us.\n\nThank you!`
          });
          remindersSent++;
        } catch (emailError) {
          console.error(`Failed to send reminder to ${client.email}:`, emailError.message);
        }
      }
    }

    return Response.json({ 
      success: true, 
      remindersSent,
      bookingsFound: tomorrowBookings.length
    });
  } catch (error) {
    console.error('Error in sendAppointmentReminders:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});