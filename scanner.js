const { createClient } = require('@supabase/supabase-js');
const FirecrawlApp = require('@mendable/firecrawl-js').default;
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Connect to your tools
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function run() {
  console.log("🚀 ENGINE STARTING...");

  // 1. Get the website URL from Supabase
  const { data: vendors, error } = await supabase
    .from('profiles')
    .select('id, website_url')
    .not('website_url', 'is', null)
    .neq('website_url', '');

  if (error) {
    console.error("❌ DATABASE ERROR:", error.message);
    return;
  }

  // 2. Setup the "Brain" (Gemini)
  // We use "gemini-1.5-flash" as the standard model name
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  for (const vendor of vendors) {
    try {
      console.log(`🔍 SCRAPING: ${vendor.website_url}`);
      const scrape = await firecrawl.scrapeUrl(vendor.website_url, { formats: ['markdown'] });

      console.log(`🤖 ASKING GEMINI...`);
      const prompt = `You are a marketing expert. Based on this website text: ${scrape.markdown.substring(0, 4000)}, 
      create 1 Instagram caption and 1 newsletter blurb. 
      Return as JSON: {"social": "...", "newsletter": "..."}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().replace(/```json|```/g, "").trim();
      const res = JSON.parse(text);

      console.log(`💾 SAVING TO DATABASE...`);
      await supabase.from('marketing_intelligence').upsert({
        vendor_id: vendor.id,
        url: vendor.website_url,
        social_caption: res.social,
        newsletter_copy: res.newsletter
      });

      console.log(`✅ ALL DONE FOR: ${vendor.website_url}`);

    } catch (e) {
      console.error(`❌ ENGINE STALLED:`, e.message);
    }
  }
}

run();
