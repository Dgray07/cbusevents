const { createClient } = require('@supabase/supabase-js');
const FirecrawlApp = require('@mendable/firecrawl-js').default;
const OpenAI = require('openai');

// Initialize the tools using your GitHub Secrets
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function run() {
  console.log("🚀 STARTING CBUSEVENTS MARKETING ENGINE...");

  // 1. Get the vendors who have a website listed
  const { data: vendors, error } = await supabase
    .from('profiles')
    .select('id, website_url')
    .not('website_url', 'is', null)
    .neq('website_url', '');

  if (error) {
    console.error("❌ DATABASE ERROR:", error.message);
    return;
  }

  console.log(`📡 Found ${vendors?.length || 0} vendors to process.`);

  for (const vendor of vendors) {
    try {
      console.log(`🔍 SCRAPING: ${vendor.website_url}`);
      const scrape = await firecrawl.scrapeUrl(vendor.website_url, { formats: ['markdown'] });

      if (!scrape.success) {
        console.log(`⚠️ Skip ${vendor.website_url}: Scrape failed.`);
        continue;
      }

      console.log(`🤖 AI GENERATING CONTENT FOR: ${vendor.id}`);
      const ai = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ 
          role: "system", 
          content: "You are the CBUSEVENTS marketing lead. Write 1 Instagram caption and 1 newsletter blurb in a premium, high-contrast tone for a Columbus audience. Return JSON: {social: '', newsletter: ''}" 
        }, { 
          role: "user", 
          content: `Content: ${scrape.markdown.substring(0, 5000)}`
        }],
        response_format: { type: "json_object" }
      });

      const res = JSON.parse(ai.choices[0].message.content);

      // 2. SAVE THE DATA to marketing_intelligence
      console.log(`💾 SAVING TO SUPABASE...`);
      const { error: upsertError } = await supabase
        .from('marketing_intelligence')
        .upsert({
          vendor_id: vendor.id,
          url: vendor.website_url,
          social_caption: res.social,
          newsletter_copy: res.newsletter,
          last_scanned: new Date().toISOString()
        });

      if (upsertError) {
        console.error("❌ UPSERT ERROR:", upsertError.message);
      } else {
        console.log(`✅ SUCCESS: Data saved for ${vendor.website_url}`);
      }

    } catch (e) {
      console.error(`❌ UNEXPECTED ERROR:`, e.message);
    }
  }
  console.log("🏁 ENGINE RUN COMPLETE.");
}

// THE MOST IMPORTANT LINE: This starts the script!
run();
