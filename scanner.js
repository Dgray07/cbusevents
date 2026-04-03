const { createClient } = require('@supabase/supabase-js');
const FirecrawlApp = require('@mendable/firecrawl-js').default;
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Connect to your tools
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

// FORCE V1 STABLE API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function run() {
  console.log("🚀 ENGINE STARTING (STABLE V1 MODE)...");

  const { data: vendors, error } = await supabase
    .from('profiles')
    .select('id, website_url')
    .not('website_url', 'is', null)
    .neq('website_url', '');

  if (error) {
    console.error("❌ DATABASE ERROR:", error.message);
    return;
  }

  // Use the specific model identifier that works with V1
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  for (const vendor of vendors) {
    try {
      console.log(`🔍 SCRAPING: ${vendor.website_url}`);
      const scrape = await firecrawl.scrapeUrl(vendor.website_url, { formats: ['markdown'] });

      console.log(`🤖 ASKING GEMINI...`);
      const prompt = `Write 1 Instagram caption and 1 newsletter blurb for cbusevents.com based on: ${scrape.markdown.substring(0, 4000)}. 
      Return JSON: {"social": "...", "newsletter": "..."}`;

      // This is the specific call that usually fixes the 404
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

      console.log(`✅ SUCCESS FOR: ${vendor.website_url}`);

    } catch (e) {
      // Detailed error logging to see exactly what's failing
      console.error(`❌ ENGINE STALLED:`, e.message);
      if (e.message.includes("404")) {
          console.log("💡 Tip: Checking if the API key has 'Generative Language API' enabled in Google Cloud Console.");
      }
    }
  }
}

run();
