const rawModules = import.meta.glob('/content/help/**/*.md', { query: '?raw', import: 'default', eager: true });

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, content: raw };

  const meta = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const val = line.slice(colonIdx + 1).trim();
    meta[key] = isNaN(val) || val === '' ? val : Number(val);
  }

  return { meta, content: match[2] };
}

function categoryTitle(slug) {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

const articles = Object.entries(rawModules).map(([path, raw]) => {
  const parts = path.split('/');
  const category = parts[parts.length - 2];
  const slug = parts[parts.length - 1].replace('.md', '');
  const { meta, content } = parseFrontmatter(raw);
  return { slug, category, title: meta.title || slug, description: meta.description || '', order: meta.order ?? 99, content };
});

const categoriesMap = {};
for (const article of articles) {
  if (!categoriesMap[article.category]) {
    categoriesMap[article.category] = { slug: article.category, title: categoryTitle(article.category), articles: [] };
  }
  categoriesMap[article.category].articles.push(article);
}

for (const cat of Object.values(categoriesMap)) {
  cat.articles.sort((a, b) => a.order - b.order);
}

export const categories = Object.values(categoriesMap);

export function getCategory(slug) {
  return categoriesMap[slug] || null;
}

export function getArticle(categorySlug, articleSlug) {
  const cat = categoriesMap[categorySlug];
  if (!cat) return null;
  return cat.articles.find(a => a.slug === articleSlug) || null;
}
