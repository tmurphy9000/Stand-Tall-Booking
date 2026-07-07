import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { categories } from "@/lib/helpContent";
import { BookOpen, ChevronRight, ArrowLeft } from "lucide-react";

const CATEGORY_ICONS = {
  "getting-started": "🚀",
};

export default function HelpHome() {
  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <Helmet>
        <title>Help Center — Stand Tall Booking</title>
        <meta name="description" content="Guides and step-by-step articles for setting up and running your barbershop on Stand Tall Booking." />
        <meta property="og:title" content="Help Center — Stand Tall Booking" />
        <meta property="og:description" content="Guides and step-by-step articles for setting up and running your barbershop on Stand Tall Booking." />
        <meta property="og:url" content="https://standtallbooking.com/help" />
        <link rel="canonical" href="https://standtallbooking.com/help" />
      </Helmet>
      {/* Header */}
      <div className="bg-[#0A0A0A] text-white">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <a href="/" className="inline-flex items-center gap-1.5 text-white/50 hover:text-white/80 text-sm mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to app
          </a>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#8B9A7E] flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold">Help Center</h1>
          </div>
          <p className="text-white/60 text-lg max-w-xl">
            Everything you need to set up and run your shop on Stand Tall Booking.
          </p>
        </div>
      </div>

      {/* Categories */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">Browse by category</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              to={`/help/${cat.slug}`}
              className="group bg-white border border-gray-200 rounded-2xl p-6 hover:border-[#8B9A7E] hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{CATEGORY_ICONS[cat.slug] || "📖"}</span>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#8B9A7E] transition-colors mt-1" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{cat.title}</h3>
              <p className="text-sm text-gray-500">{cat.articles.length} articles</p>
              <div className="mt-4 space-y-1">
                {cat.articles.slice(0, 3).map((article) => (
                  <p key={article.slug} className="text-xs text-gray-400 truncate">• {article.title}</p>
                ))}
                {cat.articles.length > 3 && (
                  <p className="text-xs text-gray-400">• and {cat.articles.length - 3} more…</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 mt-8">
        <div className="max-w-4xl mx-auto px-6 py-8 text-center">
          <p className="text-sm text-gray-400">
            Stand Tall Booking — <a href="https://standtallbooking.com" className="hover:text-[#8B9A7E] transition-colors">standtallbooking.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}
