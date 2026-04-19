import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { barber_id, old_password, new_password } = await req.json();

    if (!barber_id || !old_password || !new_password) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify old password
    const passwords = await base44.asServiceRole.entities.BarberPassword.filter({ barber_id });
    if (passwords.length === 0) {
      return Response.json({ error: 'Password record not found' }, { status: 404 });
    }

    const hashPassword = (pwd) => btoa(pwd); // Simple base64 for demo
    if (hashPassword(old_password) !== passwords[0].password_hash) {
      return Response.json({ error: 'Current password is incorrect' }, { status: 401 });
    }

    // Update password
    await base44.asServiceRole.entities.BarberPassword.update(passwords[0].id, {
      password_hash: hashPassword(new_password),
      is_temp: false,
    });

    return Response.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});