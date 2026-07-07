import React from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { getArticle, getCategory } from "@/lib/helpContent";
import { ChevronRight, ArrowLeft, ArrowRight } from "lucide-react";

function MarkdownComponents() {
  return {
    h1: ({ children }) => (
      <h1 className="text-2xl font-bold text-gray-900 mt-8 mb-4 first:mt-0">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3 pb-2 border-b border-gray-100">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-base font-semibold text-gray-800 mt-6 mb-2">{children}</h3>
    ),
    p: ({ children }) => (
      <p className="text-sm text-gray-700 leading-relaxed mb-4">{children}</p>
    ),
    a: ({ href, children }) => (
      <a href={href} className="text-[#8B9A7E] hover:text-[#6B7A5E] underline underline-offset-2 transition-colors">
        {children}
      </a>
    ),
    ul: ({ children }) => (
      <ul className="my-4 space-y-1.5 pl-1">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="my-4 space-y-1.5 pl-1 list-decimal list-inside">{children}</ol>
    ),
    li: ({ children }) => (
      <li className="text-sm text-gray-700 leading-relaxed flex gap-2">
        <span className="text-[#8B9A7E] flex-shrink-0 mt-0.5">•</span>
        <span>{children}</span>
      </li>
    ),
    blockquote: ({ children }) => (
      <div className="my-4 flex gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
        <span className="text-amber-500 text-base flex-shrink-0 mt-0.5">💡</span>
        <div className="text-sm text-amber-800 leading-relaxed [&>p]:mb-0">{children}</div>
      </div>
    ),
    code: ({ inline, children }) =>
      inline ? (
        <code className="bg-gray-100 text-gray-800 rounded px-1.5 py-0.5 text-[13px] font-mono">{children}</code>
      ) : (
        <pre className="bg-gray-900 text-gray-100 rounded-xl p-4 my-4 overflow-x-auto text-[13px] font-mono leading-relaxed">
          <code>{children}</code>
        </pre>
      ),
    pre: ({ children }) => <>{children}</>,
    table: ({ children }) => (
      <div className="my-4 overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-gray-50">{children}</thead>
    ),
    th: ({ children }) => (
      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-4 py-3 text-sm text-gray-700 border-b border-gray-100 last:border-b-0">{children}</td>
    ),
    tr: ({ children }) => (
      <tr className="hover:bg-gray-50/50 transition-colors">{children}</tr>
    ),
    img: ({ src, alt }) => (
      <div className="my-6">
        <img
          src={src}
          alt={alt}
          className="w-full rounded-xl border border-gray-200 shadow-sm"
        />
        {alt && <p className="text-xs text-gray-400 text-center mt-2">{alt}</p>}
      </div>
    ),
    hr: () => <hr className="my-6 border-gray-200" />,
    strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
    em: ({ children }) => <em className="italic text-gray-700">{children}</em>,
  };
}

export default function HelpArticle() {
  const { category, slug } = useParams();
  const article = getArticle(category, slug);
  const cat = getCategory(category);

  if (!article || !cat) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Article not found.</p>
          <Link to="/help" className="text-[#8B9A7E] hover:underline text-sm">← Back to Help Center</Link>
        </div>
      </div>
    );
  }

  const currentIndex = cat.articles.findIndex(a => a.slug === slug);
  const prevArticle = currentIndex > 0 ? cat.articles[currentIndex - 1] : null;
  const nextArticle = currentIndex < cat.articles.length - 1 ? cat.articles[currentIndex + 1] : null;

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header */}
      <div className="bg-[#0A0A0A] text-white">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <nav className="flex items-center gap-1.5 text-sm text-white/40">
            <Link to="/help" className="hover:text-white/70 transition-colors">Help Center</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link to={`/help/${cat.slug}`} className="hover:text-white/70 transition-colors">{cat.title}</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-white/80 truncate max-w-[200px]">{article.title}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 flex gap-8">
        {/* Sidebar — article nav */}
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <div className="sticky top-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{cat.title}</p>
            <nav className="space-y-0.5">
              {cat.articles.map((a, idx) => (
                <Link
                  key={a.slug}
                  to={`/help/${cat.slug}/${a.slug}`}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    a.slug === slug
                      ? "bg-[#8B9A7E]/10 text-[#6B7A5E] font-medium"
                      : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  <span className="text-xs text-gray-300 w-4 text-right flex-shrink-0">{idx + 1}</span>
                  <span className="truncate">{a.title}</span>
                </Link>
              ))}
            </nav>
            <div className="mt-6 pt-4 border-t border-gray-200">
              <Link to="/help" className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#8B9A7E] transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" />
                All categories
              </Link>
            </div>
          </div>
        </aside>

        {/* Article content */}
        <main className="flex-1 min-w-0">
          {/* Title */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{article.title}</h1>
            {article.description && (
              <p className="text-base text-gray-500 leading-relaxed">{article.description}</p>
            )}
          </div>

          {/* Markdown body */}
          <div className="bg-white rounded-2xl border border-gray-200 px-8 py-8">
            <ReactMarkdown components={MarkdownComponents()}>
              {article.content}
            </ReactMarkdown>
          </div>

          {/* Prev / Next navigation */}
          {(prevArticle || nextArticle) && (
            <div className="mt-8 grid grid-cols-2 gap-4">
              {prevArticle ? (
                <Link
                  to={`/help/${cat.slug}/${prevArticle.slug}`}
                  className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-[#8B9A7E] hover:shadow-sm transition-all group"
                >
                  <ArrowLeft className="w-4 h-4 text-gray-300 group-hover:text-[#8B9A7E] flex-shrink-0 transition-colors" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400 mb-0.5">Previous</p>
                    <p className="text-sm font-medium text-gray-800 truncate">{prevArticle.title}</p>
                  </div>
                </Link>
              ) : <div />}

              {nextArticle ? (
                <Link
                  to={`/help/${cat.slug}/${nextArticle.slug}`}
                  className="flex items-center justify-end gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-[#8B9A7E] hover:shadow-sm transition-all group text-right"
                >
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400 mb-0.5">Next</p>
                    <p className="text-sm font-medium text-gray-800 truncate">{nextArticle.title}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#8B9A7E] flex-shrink-0 transition-colors" />
                </Link>
              ) : <div />}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
