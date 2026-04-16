import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { barber_id, date } = await req.json();

    if (!barber_id || !date) {
      return Response.json({ error: "barber_id and date are required" }, { status: 400 });
    }

    // Check for approved time-off requests
    const timeOffRequests = await base44.asServiceRole.entities.TimeOffRequest.filter({
      barber_id,
      status: "approved"
    });

    const isOnTimeOff = timeOffRequests.some(request => {
      return date >= request.start_date && date <= request.end_date;
    });

    return Response.json({
      available: !isOnTimeOff,
      reason: isOnTimeOff ? "Barber is on approved time off" : null
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});