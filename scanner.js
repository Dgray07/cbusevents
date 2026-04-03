const { createClient } = require('@supabase/supabase-js');
const FirecrawlApp = require('@mendable/firecrawl-js').default;
const { GoogleGenerativeAI } = require("@google/generative-ai");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function run() {
  console.log("🚀 ENGINE STARTING...");

  const { data: vendors, error } = await supabase
    .from('profiles')
    .select('id, website_url')
    .not('website_url', 'is', null)
    .neq('website_url', '');

  if (error) {
    console.error("❌ DATABASE ERROR:", error.message);
    return;
  }

  // SWAP: Using 'gemini-pro' instead of 'gemini-1.5-flash'
  // This model is the most compatible with all API keys
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  for (const vendor of vendors) {
    try {
      console.log(`🔍 SCRAPING: ${vendor.website_url}`);
      const scrape = await firecrawl.scrapeUrl(vendor.website_url, { formats: ['markdown'] });

      console.log(`🤖 ASKING GEMINI PRO...`);
      const prompt = `Write 1 Instagram caption and 1 newsletter blurb for cbusevents.com based on this text: ${scrape.markdown.substring(0, 3000)}. 
      Return JSON only: {"social": "...", "newsletter": "..."}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().replace(/```json|```/g, "").trim();
      const res = JSON.parse(text);

      console.log(`💾 SAVING TO DATABASE...`);
      await supabase.from('marketing_intelligence').upsert({
        vendor_id: vendor.id,
        url: vendor.website_url,
        social_caption: res.social,
        newsletter_copy: res.newsletter,
        last_scanned: new Date().toISOString()
      });

      console.log(`✅ SUCCESS: ${vendor.website_url}`);

    } catch (e) {
      console.error(`❌ ERROR:`, e.message);
    }
  }
}

run();
