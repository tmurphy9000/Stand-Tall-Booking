import React from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { getCategory } from "@/lib/helpContent";
import { ChevronRight, BookOpen, ArrowLeft } from "lucide-react";

export default function HelpCategory() {
  const { category } = useParams();
  const cat = getCategory(category);

  if (!cat) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Category not found.</p>
          <Link to="/help" className="text-[#8B9A7E] hover:underline text-sm">← Back to Help Center</Link>
        </div>
      </div>
    );
  }

  const canonicalUrl = `https://standtallbooking.com/help/${cat.slug}`;
  const categoryDescription = `${cat.articles.length} articles covering ${cat.title.toLowerCase()} on Stand Tall Booking — step-by-step guides for barbershop owners.`;

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <Helmet>
        <title>{cat.title} — Stand Tall Booking Help</title>
        <meta name="description" content={categoryDescription} />
        <meta property="og:title" content={`${cat.title} — Stand Tall Booking Help`} />
        <meta property="og:description" content={categoryDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <link rel="canonical" href={canonicalUrl} />
      </Helmet>
      {/* Header */}
      <div className="bg-[#0A0A0A] text-white">
        <div className="max-w-4xl mx-auto px-6 py-10">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm text-white/40 mb-6">
            <Link to="/help" className="hover:text-white/70 transition-colors">Help Center</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-white/80">{cat.title}</span>
          </nav>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#8B9A7E] flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold">{cat.title}</h1>
          </div>
          <p className="text-white/50 text-sm ml-[52px]">{cat.articles.length} articles</p>
        </div>
      </div>

      {/* Article List */}
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="space-y-3">
          {cat.articles.map((article, idx) => (
            <Link
              key={article.slug}
              to={`/help/${cat.slug}/${article.slug}`}
              className="group flex items-center gap-4 bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-[#8B9A7E] hover:shadow-sm transition-all"
            >
              <div className="w-7 h-7 rounded-full bg-gray-100 group-hover:bg-[#8B9A7E]/10 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-gray-400 group-hover:text-[#8B9A7E] transition-colors">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 group-hover:text-[#6B7A5E] transition-colors">{article.title}</p>
                {article.description && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{article.description}</p>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#8B9A7E] flex-shrink-0 transition-colors" />
            </Link>
          ))}
        </div>

        <div className="mt-8">
          <Link to="/help" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#8B9A7E] transition-colors">
            <ArrowLeft className="w-4 h-4" />
            All categories
          </Link>
        </div>
      </div>
    </div>
  );
}
