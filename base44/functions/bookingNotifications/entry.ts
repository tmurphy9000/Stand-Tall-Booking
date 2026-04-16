import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    // Handle booking created
    if (event.type === 'create') {
      const booking = data;
      
      // Notify client - booking confirmation
      if (booking.client_email) {
        await base44.asServiceRole.functions.invoke('sendNotification', {
          recipient_email: booking.client_email,
          recipient_type: 'client',
          type: 'booking_confirmed',
          title: 'Booking Confirmed - Stand Tall Barbershop',
          message: `Hi ${booking.client_name},\n\nYour appointment has been confirmed!\n\nService: ${booking.service_name}\nBarber: ${booking.barber_name}\nDate: ${booking.date}\nTime: ${booking.start_time}\n\nWe look forward to seeing you!\n\n- Stand Tall Team`,
          booking_id: booking.id,
          client_id: booking.client_id
        });
      }

      // Notify staff - new booking
      const users = await base44.asServiceRole.entities.User.list();
      const admins = users.filter(u => u.role === 'admin');
      
      for (const admin of admins) {
        await base44.asServiceRole.functions.invoke('sendNotification', {
          recipient_email: admin.email,
          recipient_type: 'staff',
          type: 'new_booking',
          title: 'New Booking Created',
          message: `New booking created:\n\nClient: ${booking.client_name}\nService: ${booking.service_name}\nBarber: ${booking.barber_name}\nDate: ${booking.date} at ${booking.start_time}`,
          booking_id: booking.id
        });
      }
    }

    // Handle booking cancelled
    if (event.type === 'update' && old_data?.status !== 'cancelled' && data.status === 'cancelled') {
      const booking = data;
      
      // Notify client - cancellation
      if (booking.client_email) {
        await base44.asServiceRole.functions.invoke('sendNotification', {
          recipient_email: booking.client_email,
          recipient_type: 'client',
          type: 'booking_cancelled',
          title: 'Appointment Cancelled - Stand Tall Barbershop',
          message: `Hi ${booking.client_name},\n\nYour appointment has been cancelled.\n\nService: ${booking.service_name}\nBarber: ${booking.barber_name}\nDate: ${booking.date}\nTime: ${booking.start_time}\n${booking.cancel_reason ? `\nReason: ${booking.cancel_reason}` : ''}\n\nFeel free to book another appointment anytime.\n\n- Stand Tall Team`,
          booking_id: booking.id,
          client_id: booking.client_id
        });
      }

      // Notify staff - cancellation
      const users = await base44.asServiceRole.entities.User.list();
      const admins = users.filter(u => u.role === 'admin');
      
      for (const admin of admins) {
        await base44.asServiceRole.functions.invoke('sendNotification', {
          recipient_email: admin.email,
          recipient_type: 'staff',
          type: 'booking_cancelled',
          title: 'Booking Cancelled',
          message: `Booking cancelled:\n\nClient: ${booking.client_name}\nService: ${booking.service_name}\nBarber: ${booking.barber_name}\nDate: ${booking.date} at ${booking.start_time}${booking.cancel_reason ? `\nReason: ${booking.cancel_reason}` : ''}`,
          booking_id: booking.id
        });
      }
    }

    // Handle booking completed - send review reminder
    if (event.type === 'update' && old_data?.status !== 'completed' && data.status === 'completed') {
      const booking = data;
      
      if (booking.client_email) {
        await base44.asServiceRole.functions.invoke('sendNotification', {
          recipient_email: booking.client_email,
          recipient_type: 'client',
          type: 'review_reminder',
          title: 'How was your visit? - Stand Tall Barbershop',
          message: `Hi ${booking.client_name},\n\nThank you for visiting Stand Tall Barbershop!\n\nWe'd love to hear about your experience with ${booking.barber_name}. Please take a moment to leave a review.\n\nLog in to your client portal to share your feedback.\n\n- Stand Tall Team`,
          booking_id: booking.id,
          client_id: booking.client_id
        });
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});