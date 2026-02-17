import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // API Key Authentication
        const expectedApiKey = Deno.env.get("CLIENT_APP_API_KEY");
        if (!expectedApiKey) {
            return Response.json({ error: "Server misconfiguration: API key not set" }, { status: 500 });
        }

        const clientApiKey = req.headers.get("X-API-KEY");
        if (!clientApiKey || clientApiKey !== expectedApiKey) {
            return Response.json({ error: "Unauthorized: Invalid API Key" }, { status: 401 });
        }

        // Only allow POST requests
        if (req.method !== "POST") {
            return Response.json({ error: "Method Not Allowed" }, { status: 405 });
        }

        const bookingData = await req.json();

        // Validate required fields
        if (!bookingData.client_name || !bookingData.barber_id || !bookingData.service_id || !bookingData.date || !bookingData.start_time) {
            return Response.json({ error: "Missing required fields: client_name, barber_id, service_id, date, start_time" }, { status: 400 });
        }

        // Get barber and service details to populate names
        const barber = await base44.asServiceRole.entities.Barber.get(bookingData.barber_id);
        const service = await base44.asServiceRole.entities.Service.get(bookingData.service_id);

        if (!barber || !service) {
            return Response.json({ error: "Invalid barber_id or service_id" }, { status: 400 });
        }

        // Prepare complete booking data
        const completeBookingData = {
            ...bookingData,
            barber_name: barber.name,
            service_name: service.name,
            duration: bookingData.duration || service.duration,
            price: bookingData.price || service.price,
            final_price: bookingData.final_price || bookingData.price || service.price,
            status: bookingData.status || "scheduled",
            payment_method: bookingData.payment_method || "cash",
            discount_type: bookingData.discount_type || "none",
            discount_value: bookingData.discount_value || 0
        };

        // Calculate end_time if not provided
        if (!completeBookingData.end_time) {
            const [hours, minutes] = completeBookingData.start_time.split(':').map(Number);
            const startMinutes = hours * 60 + minutes;
            const endMinutes = startMinutes + completeBookingData.duration;
            const endHours = Math.floor(endMinutes / 60);
            const endMins = endMinutes % 60;
            completeBookingData.end_time = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
        }

        // Create the booking using service role
        const newBooking = await base44.asServiceRole.entities.Booking.create(completeBookingData);

        return Response.json({ success: true, booking: newBooking }, { status: 201 });

    } catch (error) {
        console.error("Error creating booking:", error);
        return Response.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
});