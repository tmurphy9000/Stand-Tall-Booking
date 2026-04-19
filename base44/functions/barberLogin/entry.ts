import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email, password } = await req.json();

    if (!email || !password) {
      return Response.json({ error: 'Email and password required' }, { status: 400 });
    }

    // Find barber by email
    const barbers = await base44.asServiceRole.entities.Barber.filter({ email });
    if (barbers.length === 0) {
      return Response.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const barber = barbers[0];

    // Find password record
    const passwords = await base44.asServiceRole.entities.BarberPassword.filter({ barber_id: barber.id });
    if (passwords.length === 0) {
      return Response.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const passwordRecord = passwords[0];

    // Simple hash comparison (in production, use bcrypt)
    const hashPassword = (pwd) => btoa(pwd); // Simple base64 for demo
    if (hashPassword(password) !== passwordRecord.password_hash) {
      return Response.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    return Response.json({
      success: true,
      barber_id: barber.id,
      barber_name: barber.name,
      email: barber.email,
      is_temp: passwordRecord.is_temp,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});