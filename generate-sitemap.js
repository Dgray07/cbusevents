const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const BASE_URL = 'https://cbusevents.com';

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// Static pages with their priorities and change frequencies
const STATIC_PAGES = [
  { path: '/',                                  changefreq: 'daily',   priority: '1.0' },
  { path: '/blog.html',                         changefreq: 'weekly',  priority: '0.7' },
  { path: '/gallery-hop.html',                  changefreq: 'monthly', priority: '0.8' },
  { path: '/signup.html',                       changefreq: 'monthly', priority: '0.8' },
  { path: '/signup.html?role=venue',            changefreq: 'monthly', priority: '0.8' },
  { path: '/signup.html?role=vendor',           changefreq: 'monthly', priority: '0.8' },
  { path: '/signup.html?role=planner',          changefreq: 'monthly', priority: '0.8' },
  { path: '/signup.html?role=attendee',         changefreq: 'monthly', priority: '0.7' },
  { path: '/community.html',                    changefreq: 'weekly',  priority: '0.7' },
  { path: '/community.html?c=black-columbus',   changefreq: 'weekly',  priority: '0.7' },
  { path: '/community.html?c=latino-columbus',  changefreq: 'weekly',  priority: '0.7' },
  { path: '/community.html?c=lgbtq-columbus',   changefreq: 'weekly',  priority: '0.7' },
  { path: '/community.html?c=arts-creative',    changefreq: 'weekly',  priority: '0.7' },
  { path: '/community.html?c=osu-campus',       changefreq: 'weekly',  priority: '0.7' },
  { path: '/cbus-planner-portal.html',          changefreq: 'monthly', priority: '0.5' },
  { path: '/cbus-venue-portal.html',            changefreq: 'monthly', priority: '0.5' },
  { path: '/cbus-vendor-portal.html',           changefreq: 'monthly', priority: '0.5' },
];

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry({ loc, changefreq, priority, lastmod }) {
  return `  <url>
    <loc>${escapeXml(loc)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

async function generate() {
  console.log('Fetching events from Supabase...');

  const { data: events, error } = await sb
    .from('events')
    .select('id, title, start_time, updated_at')
    .eq('is_published', true)
    .gte('start_time', new Date().toISOString()) // Only future + today events
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Supabase error:', error.message);
    process.exit(1);
  }

  console.log(`Found ${events.length} published events.`);

  const staticEntries = STATIC_PAGES.map(p =>
    urlEntry({ loc: BASE_URL + p.path, changefreq: p.changefreq, priority: p.priority })
  );

  const eventEntries = events.map(e => {
    const lastmod = e.updated_at
      ? new Date(e.updated_at).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    return urlEntry({
      loc: `${BASE_URL}/event.html?id=${e.id}`,
      changefreq: 'weekly',
      priority: '0.9',
      lastmod
    });
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

  <!-- Static pages -->
${staticEntries.join('\n\n')}

  <!-- Event pages (${events.length} events) — auto-generated ${new Date().toISOString().split('T')[0]} -->
${eventEntries.join('\n\n')}

</urlset>`;

  fs.writeFileSync('sitemap.xml', xml, 'utf8');
  console.log(`sitemap.xml written with ${staticEntries.length} static + ${eventEntries.length} event URLs.`);
}

generate();
