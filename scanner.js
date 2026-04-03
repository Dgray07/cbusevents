const { createClient } = require('@supabase/supabase-js');
const FirecrawlApp = require('@mendable/firecrawl-js').default;
const OpenAI = require('openai');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function run() {
  // 1. Get all vendors who have a website listed
  const { data: vendors } = await supabase.from('profiles').select('id, website_url').not('website_url', 'is', null);

  for (const vendor of vendors) {
    try {
      console.log(`Scanning: ${vendor.website_url}`);
      const scrape = await firecrawl.scrapeUrl(vendor.website_url, { formats: ['markdown'] });

      const ai = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "system", content: "You are the CBUSEVENTS hype-man. Write 1 Instagram caption and 1 newsletter blurb in a premium, high-contrast tone for a Columbus audience. Return JSON: {social: '', newsletter: ''}" }],
        response_format: { type: "json_object" }
      });

      const res = JSON.parse(ai.choices[0].message.content);

      await supabase.from('marketing_intelligence').upsert({
        vendor_id: vendor.id,
        url: vendor.website_url,
        social_caption: res.social,
        newsletter_copy: res.newsletter
      });
    } catch (e) { console.error(`Failed ${vendor.website_url}:`, e); }
  }
}
run();
