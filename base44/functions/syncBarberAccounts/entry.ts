import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { barber_name, user_id, email } = await req.json();

    if (!barber_name || !user_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Find all barber records matching the name
    const barbers = await base44.entities.Barber.filter({});
    const matchingBarbers = barbers.filter(b => 
      b.name && b.name.toLowerCase() === barber_name.toLowerCase()
    );

    // Update matching barbers with the user_id (link to user account)
    let updated = 0;
    for (const barber of matchingBarbers) {
      if (!barber.user_id) {
        await base44.asServiceRole.entities.Barber.update(barber.id, {
          user_id: user_id,
          email: email,
        });
        updated++;
      }
    }

    return Response.json({
      success: true,
      matched: matchingBarbers.length,
      updated: updated,
      message: `Synced ${updated} barber record(s) to user account`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});