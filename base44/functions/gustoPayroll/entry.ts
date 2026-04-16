import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is authenticated and has admin access
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the authenticated user's barber record to check permission level
    const barbers = await base44.entities.Barber.filter({ user_id: user.id });
    const currentBarber = barbers[0];
    
    if (!currentBarber || (currentBarber.permission_level !== "owner" && currentBarber.permission_level !== "manager")) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get the payload
    const payload = await req.json();
    const { payrollData, startDate, endDate } = payload;

    if (!payrollData || !Array.isArray(payrollData)) {
      return Response.json({ 
        success: false, 
        error: 'Invalid payroll data' 
      }, { status: 400 });
    }

    // Get Gusto credentials from environment
    const gustoApiToken = Deno.env.get('GUSTO_API_TOKEN');
    const gustoCompanyId = Deno.env.get('GUSTO_COMPANY_ID');

    if (!gustoApiToken || !gustoCompanyId) {
      return Response.json({ 
        success: false, 
        error: 'Gusto credentials not configured. Please set GUSTO_API_TOKEN and GUSTO_COMPANY_ID in your app secrets.' 
      }, { status: 400 });
    }

    // Call Gusto API to create off-cycle payroll
    const gustoResponse = await fetch(`https://api.gusto.com/v1/companies/${gustoCompanyId}/payrolls`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${gustoApiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pay_period: {
          start_date: startDate,
          end_date: endDate,
        },
        payroll_type: 'Off-Cycle',
        employee_compensations: payrollData.map(barber => ({
          employee_id: barber.barber_id,
          fixed_compensations: [
            {
              name: 'Service Commission',
              amount: Math.round(barber.service_commission * 100), // Convert to cents
            },
            {
              name: 'Product Commission',
              amount: Math.round(barber.product_commission * 100),
            },
            {
              name: 'Tips',
              amount: Math.round(barber.tips * 100),
            },
          ],
        })),
      }),
    });

    if (!gustoResponse.ok) {
      const errorData = await gustoResponse.json().catch(() => ({}));
      console.error('Gusto API error:', errorData);
      return Response.json({ 
        success: false, 
        error: `Gusto API error: ${errorData.message || gustoResponse.statusText}` 
      }, { status: gustoResponse.status });
    }

    const gustoData = await gustoResponse.json();

    // Log the payroll run in Base44 (optional - you could create a PayrollRun entity)
    // await base44.entities.PayrollRun.create({
    //   start_date: startDate,
    //   end_date: endDate,
    //   total_amount: payrollData.reduce((sum, b) => sum + b.total_earnings, 0),
    //   gusto_payroll_id: gustoData.id,
    //   barber_count: payrollData.length,
    // });

    return Response.json({
      success: true,
      gusto_payroll_id: gustoData.id,
      message: 'Payroll submitted to Gusto successfully',
    });

  } catch (error) {
    console.error('Payroll submission error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});