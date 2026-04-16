import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { recipient_email, recipient_type, type, title, message, booking_id, client_id } = await req.json();

    // Create notification record
    const notification = await base44.asServiceRole.entities.Notification.create({
      recipient_email,
      recipient_type,
      type,
      title,
      message,
      booking_id,
      client_id,
      is_read: false,
      email_sent: false,
      date: new Date().toISOString().split('T')[0]
    });

    // Send email notification
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: "Stand Tall Barbershop",
        to: recipient_email,
        subject: title,
        body: message
      });

      // Update notification as sent
      await base44.asServiceRole.entities.Notification.update(notification.id, {
        email_sent: true
      });
    } catch (emailError) {
      console.error("Email send failed:", emailError);
    }

    return Response.json({ success: true, notification });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});