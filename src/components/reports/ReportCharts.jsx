import React from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const GOLD = "#C9A94E";
const DARK = "#0A0A0A";
const COLORS = ["#C9A94E", "#0A0A0A", "#64748B", "#A07D2B", "#E8D9A0", "#475569"];

export function RevenueChart({ data }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <h3 className="text-sm font-semibold mb-4">Revenue Trend</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: "1px solid #f0f0f0", fontSize: 12 }}
            formatter={(v) => [`$${v.toFixed(2)}`, "Revenue"]}
          />
          <Line type="monotone" dataKey="revenue" stroke={GOLD} strokeWidth={2} dot={{ fill: GOLD, r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ServiceBreakdownChart({ data }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <h3 className="text-sm font-semibold mb-4">Service Breakdown</h3>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" outerRadius={70} innerRadius={40} dataKey="value" paddingAngle={2}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #f0f0f0", fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-2 mt-2 justify-center">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <span className="text-[10px] text-gray-500">{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BarberPerformanceChart({ data }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <h3 className="text-sm font-semibold mb-4">Barber Performance</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #f0f0f0", fontSize: 12 }} />
          <Bar dataKey="revenue" fill={GOLD} radius={[4, 4, 0, 0]} />
          <Bar dataKey="bookings" fill={DARK} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RetentionChart({ data }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <h3 className="text-sm font-semibold mb-4">Client Retention</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} unit="%" />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #f0f0f0", fontSize: 12 }} formatter={(v) => [`${v}%`, "Retention"]} />
          <Bar dataKey="rate" fill={GOLD} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StaffPerformanceChart({ data }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <h3 className="text-sm font-semibold mb-4">Staff Performance</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis type="number" tick={{ fontSize: 10 }} />
          <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #f0f0f0", fontSize: 12 }} />
          <Bar dataKey="serviceRevenue" stackId="a" fill={GOLD} name="Services" />
          <Bar dataKey="productRevenue" stackId="a" fill="#64748B" name="Products" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ClientLifetimeValueChart({ data }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <h3 className="text-sm font-semibold mb-4">Top Clients by Lifetime Value</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis type="number" tick={{ fontSize: 10 }} />
          <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
          <Tooltip 
            contentStyle={{ borderRadius: 12, border: "1px solid #f0f0f0", fontSize: 12 }} 
            formatter={(v, name) => name === "value" ? [`$${v.toFixed(2)}`, "Total Spent"] : [v, "Visits"]}
          />
          <Bar dataKey="value" fill={GOLD} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ServicePopularityChart({ data }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <h3 className="text-sm font-semibold mb-4">Most Popular Services</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #f0f0f0", fontSize: 12 }} />
          <Bar dataKey="count" fill={GOLD} radius={[4, 4, 0, 0]} name="Bookings" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function NoShowRatesChart({ data }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <h3 className="text-sm font-semibold mb-4">No-Show & Cancellation Rates</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} unit="%" />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #f0f0f0", fontSize: 12 }} />
          <Bar dataKey="noShowRate" fill="#EF4444" radius={[4, 4, 0, 0]} name="No-Show %" />
          <Bar dataKey="cancelRate" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Cancel %" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}