const { createClient } = require('@supabase/supabase-js');
const FirecrawlApp = require('@mendable/firecrawl-js').default;
const OpenAI = require('openai');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function run() {
  console.log("🚀 Starting Cbus Engine...");

  // 1. Fetch only profiles that HAVE a website URL
  const { data: vendors, error } = await supabase
    .from('profiles')
    .select('id, website_url')
    .not('website_url', 'is', null)
    .neq('website_url', '');

  if (error) {
    console.error("❌ Supabase Fetch Error:", error.message);
    return;
  }

  if (!vendors || vendors.length === 0) {
    console.log("⚠️ No vendors found with valid URLs. Add a URL to a profile in Supabase to test!");
    return;
  }

  console.log(`Found ${vendors.length} vendors to scan.`);

  for (const vendor of vendors) {
    try {
      console.log(`🔍 Scraping: ${vendor.website_url}`);
      const scrape = await firecrawl.scrapeUrl(vendor.website_url, { formats: ['markdown'] });

      if (!scrape.success) {
        console.log(`skipping ${vendor.website_url}: Scrape failed.`);
        continue;
      }

      console.log(`🤖 Generating AI content for ${vendor.id}...`);
      const ai = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ 
          role: "system", 
          content: "You are the CBUSEVENTS marketing lead. Write 1 Instagram caption and 1 newsletter blurb in a premium, high-contrast tone for a Columbus audience. Return JSON: {social: '', newsletter: ''}" 
        }, { 
          role: "user", 
          content: `Content: ${scrape.markdown.substring(0, 5000)}` // Limit text size
        }],
        response_format: { type: "json_object" }
      });

      const res = JSON.parse(ai.choices[0].message.content);

      const { error: upsertError } = await supabase.from('marketing_intelligence').upsert({
        vendor_id: vendor.id,
        url: vendor.website_url,
        social_caption: res.social,
        newsletter_copy: res.newsletter
      });

      if (upsertError) console.error("❌ Upsert Error:", upsertError.message);
      else console.log(`✅ Successfully updated ${vendor.website_url}`);

    } catch (e) {
      console.error(`❌ Unexpected error for ${vendor.website_url}:`, e.message);
    }
  }
  console.log("🏁 Engine run complete.");
}

run();
