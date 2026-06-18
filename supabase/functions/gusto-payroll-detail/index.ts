import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// TODO: switch to api.gusto.com once the app is approved for production
const GUSTO_BASE = "https://api.gusto-demo.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  const { data: { user }, error: authError } = await adminClient.auth.getUser(jwt);
  if (authError || !user) return json({ error: "Unauthorized" }, 401);

  let body: { payroll_uuid: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  const { payroll_uuid } = body;
  if (!payroll_uuid) return json({ error: "payroll_uuid is required" }, 400);

  // Resolve shop and Gusto connection
  const { data: barber } = await adminClient
    .from("barbers")
    .select("shop_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!barber?.shop_id) return json({ error: "Shop not found for this user" }, 404);

  const { data: connection } = await adminClient
    .from("gusto_connections")
    .select("access_token, company_uuid")
    .eq("shop_id", barber.shop_id)
    .maybeSingle();

  if (!connection) return json({ error: "Gusto not connected" }, 404);

  const gustoHeaders = { Authorization: `Bearer ${connection.access_token}` };

  // Fetch payroll detail and employees list in parallel
  const [payrollRes, employeesRes] = await Promise.all([
    fetch(
      `${GUSTO_BASE}/v1/companies/${connection.company_uuid}/payrolls/${payroll_uuid}?include[]=employee_compensations`,
      { headers: gustoHeaders }
    ),
    fetch(
      `${GUSTO_BASE}/v1/companies/${connection.company_uuid}/employees`,
      { headers: gustoHeaders }
    ),
  ]);

  if (!payrollRes.ok) {
    const detail = await payrollRes.text();
    console.error("[gusto-payroll-detail] Gusto error:", payrollRes.status, detail);
    return json({ error: "Failed to fetch payroll detail from Gusto", detail }, payrollRes.status);
  }

  // deno-lint-ignore no-explicit-any
  const payroll: any = await payrollRes.json();

  // Build employee name lookup map — only first/last name, nothing sensitive
  const nameMap: Record<string, string> = {};
  if (employeesRes.ok) {
    // deno-lint-ignore no-explicit-any
    const employees: any[] = await employeesRes.json();
    if (Array.isArray(employees)) {
      for (const emp of employees) {
        if (emp.uuid) {
          nameMap[emp.uuid] =
            [emp.first_name, emp.last_name].filter(Boolean).join(" ") || "Unknown";
        }
      }
    }
  }

  // Strip every sensitive field from employee_compensations —
  // only expose name, gross_pay, net_pay
  // deno-lint-ignore no-explicit-any
  const safeCompensations = (payroll.employee_compensations ?? []).map((comp: any) => ({
    employee_uuid: comp.employee_uuid,
    employee_name: nameMap[comp.employee_uuid] ?? "Unknown Employee",
    gross_pay: comp.gross_pay ?? null,
    net_pay: comp.net_pay ?? null,
  }));

  // Contractor payments — wage and reimbursement only (no payment method, no bank details)
  // deno-lint-ignore no-explicit-any
  const safeContractorPayments = (payroll.contractor_payments ?? []).map((cp: any) => ({
    contractor_uuid: cp.contractor_uuid,
    // Gusto doesn't always return contractor names inline; label generically for now
    contractor_name: nameMap[cp.contractor_uuid] ?? "Contractor",
    wage: cp.wage ?? null,
    hours: cp.hours ?? null,
    reimbursement: cp.reimbursement ?? null,
  }));

  // Return only safe summary fields — no taxes, no deductions, no bank details
  return json({
    payroll: {
      payroll_uuid: payroll.payroll_uuid,
      pay_period: payroll.pay_period ?? null,
      check_date: payroll.check_date ?? null,
      processed: payroll.processed ?? false,
      totals: {
        gross_pay: payroll.totals?.gross_pay ?? null,
        net_pay: payroll.totals?.net_pay ?? null,
      },
      employee_compensations: safeCompensations,
      contractor_payments: safeContractorPayments,
    },
  });
});
