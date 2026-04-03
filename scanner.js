const { createClient } = require('@supabase/supabase-js');
const FirecrawlApp = require('@mendable/firecrawl-js').default;
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Clients
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function run() {
  console.log("🚀 STARTING GEMINI-POWERED CBUS ENGINE...");

  // 1. Fetch profiles with URLs
  const { data: vendors, error } = await supabase
    .from('profiles')
    .select('id, website_url')
    .not('website_url', 'is', null)
    .neq('website_url', '');

  if (error) {
    console.error("❌ DATABASE ERROR:", error.message);
    return;
  }

  console.log(`📡 Found ${vendors?.length || 0} vendors to scan.`);

  // 2. Initialize Gemini Model (Stable Version)
  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash" 
  });

  for (const vendor of vendors) {
    try {
      console.log(`🔍 SCRAPING: ${vendor.website_url}`);
      const scrape = await firecrawl.scrapeUrl(vendor.website_url, { formats: ['markdown'] });

      if (!scrape.success) {
        console.log(`⚠️ Skip ${vendor.website_url}: Scrape failed.`);
        continue;
      }

      console.log(`🤖 GEMINI GENERATING FOR: ${vendor.id}`);
      
      const prompt = `You are the CBUSEVENTS marketing lead. Based on this website content, write 1 Instagram caption and 1 newsletter blurb in a premium, high-contrast orange branding tone for a Columbus, Ohio audience. 
      Return ONLY a raw JSON object with these exact keys: {"social": "caption here", "newsletter": "blurb here"}
      
      Content: ${scrape.markdown.substring(0, 8000)}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      
      // Clean up the response in case Gemini adds markdown code blocks
      text = text.replace(/```json|```/g, "").trim();
      const res = JSON.parse(text);

      console.log(`💾 SAVING TO SUPABASE...`);
      const { error: upsertError } = await supabase.from('marketing_intelligence').upsert({
        vendor_id: vendor.id,
        url: vendor.website_url,
        social_caption: res.social,
        newsletter_copy: res.newsletter,
        last_scanned: new Date().toISOString()
      });

      if (upsertError) console.error("❌ UPSERT ERROR:", upsertError.message);
      else console.log(`✅ SUCCESS: ${vendor.website_url}`);

    } catch (e) {
      console.error(`❌ ERROR:`, e.message);
    }
  }
  console.log("🏁 ENGINE RUN COMPLETE.");
}

// Ignition
run();
