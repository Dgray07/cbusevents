/**
 * CBUSEVENTS AI Chat Widget
 * Drop this script into any portal page. It:
 *  - Renders a floating trigger button
 *  - Opens a slide-out panel with the full chat UI
 *  - Pulls live venue + event data from Supabase for context
 *  - Customises the system prompt based on the current user's role
 *
 * Usage (add near </body>):
 *   <script>
 *     window.CBUS_CHAT_CONFIG = {
 *       role: 'venue_owner',          // 'venue_owner' | 'vendor' | 'organizer' | 'customer' | 'guest'
 *       userName: 'Marcus',           // optional — personalises greeting
 *       supabaseUrl: 'https://...',
 *       supabaseKey: 'eyJ...',
 *     };
 *   </script>
 *   <script src="chat-widget.js"></script>
 */

(function () {
  'use strict';

  // ── CONFIG ──────────────────────────────────────────────────────────────────
  const CFG = window.CBUS_CHAT_CONFIG || {};
  const ROLE      = CFG.role      || 'guest';
  const USER_NAME = CFG.userName  || null;
  const SB_URL    = CFG.supabaseUrl || 'https://toblgvatvsjljbqogzsv.supabase.co';
  const SB_KEY    = CFG.supabaseKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvYmxndmF0dnNqbGpicW9nenN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDgwNTAsImV4cCI6MjA4NzY4NDA1MH0._WJEQPizNDiQfDXQB_DHPaQhixPGpMdmYQSmyWmm_FQ';

  // ── ROLE COPY ───────────────────────────────────────────────────────────────
  const ROLE_META = {
    venue_owner: {
      color: '#FF6B35',
      colorDim: 'rgba(255,107,53,0.15)',
      colorBorder: 'rgba(255,107,53,0.3)',
      label: 'Venue Assistant',
      greeting: `Hey${USER_NAME ? ' ' + USER_NAME : ''}! I'm your CBUSEVENTS venue assistant. Ask me about optimising your listing, pricing plans, getting more bookings, or anything about the Columbus events market.`,
      suggestions: [
        'How do I get more inquiries?',
        'What does the Premium plan include?',
        'How do I publish an event?',
        'What types of events book most in Columbus?',
      ],
    },
    vendor: {
      color: '#60a5fa',
      colorDim: 'rgba(96,165,250,0.15)',
      colorBorder: 'rgba(96,165,250,0.3)',
      label: 'Vendor Assistant',
      greeting: `Hey${USER_NAME ? ' ' + USER_NAME : ''}! I'm your CBUSEVENTS vendor assistant. Ask me about growing your Columbus client base, sending proposals, or upgrading your plan.`,
      suggestions: [
        'How do I get discovered by venues?',
        'What does Premium unlock for vendors?',
        'How do proposals work?',
        'What services are most in demand in Columbus?',
      ],
    },
    organizer: {
      color: '#a855f7',
      colorDim: 'rgba(168,85,247,0.15)',
      colorBorder: 'rgba(168,85,247,0.3)',
      label: 'Organizer Assistant',
      greeting: `Hey${USER_NAME ? ' ' + USER_NAME : ''}! I'm your CBUSEVENTS organizer assistant. I can help you find venues, connect with vendors, or answer any questions about planning your next Columbus event.`,
      suggestions: [
        'Find me a venue for 80 guests in Short North',
        'What vendors are available for a wedding?',
        'How do I publish my event?',
        'What neighbourhoods are best for corporate events?',
      ],
    },
    customer: {
      color: '#FF6B35',
      colorDim: 'rgba(255,107,53,0.15)',
      colorBorder: 'rgba(255,107,53,0.3)',
      label: 'Columbus Events Guide',
      greeting: `Hey${USER_NAME ? ' ' + USER_NAME : ''}! I'm your Columbus events guide. Ask me what's happening this weekend, where to find the best venues, or anything about the Columbus scene.`,
      suggestions: [
        "What's happening this weekend?",
        'Best rooftop bars in Columbus?',
        'How do I buy tickets?',
        'Events in Short North this month?',
      ],
    },
    guest: {
      color: '#FF6B35',
      colorDim: 'rgba(255,107,53,0.15)',
      colorBorder: 'rgba(255,107,53,0.3)',
      label: 'AI Assistant',
      greeting: `Hey! I'm the CBUSEVENTS assistant. Ask me anything about Columbus events, venues, vendors, or how to get started on the platform.`,
      suggestions: [
        'How do I list my venue?',
        'What events are happening in Columbus?',
        'How do I join as a vendor?',
        'What is CBUSEVENTS?',
      ],
    },
  };

  const META = ROLE_META[ROLE] || ROLE_META.guest;

  // ── SYSTEM PROMPT BUILDER ────────────────────────────────────────────────────
  function buildSystemPrompt(liveData) {
    const base = `You are an AI assistant embedded inside the CBUSEVENTS platform — Columbus, Ohio's event marketplace connecting venues, vendors, organizers, and attendees. You are talking to a ${ROLE === 'guest' ? 'visitor' : ROLE.replace('_', ' ')}${USER_NAME ? ' named ' + USER_NAME : ''}. Be warm, concise, and action-oriented. Always encourage the user to take the next step on the platform. Never make up specific prices, dates, or availability — direct users to their portal dashboard for live data. For links, always use cbusevents.com as the base URL.`;

    const roleContext = {
      venue_owner: `This user owns or manages a Columbus venue. Help them maximise their listing performance, get more bookings, publish events, and grow their revenue through the platform.`,
      vendor: `This user is a Columbus vendor or service provider. Help them get discovered by venues and organizers, understand how proposals work, and build out their profile/portfolio.`,
      organizer: `This user is a Columbus event organizer. Help them find venues, connect with vendors, publish events, and manage their workflow.`,
      customer: `This user is a Columbus event attendee. Help them discover events, find things to do, and navigate the platform. Encourage them to save venues and follow organisers for personalised recommendations.`,
      guest: `This visitor is not yet signed in. Help them understand the platform and guide them to sign up at cbusevents.com/auth.html.`,
    };

    let prompt = base + '\n\n' + (roleContext[ROLE] || roleContext.guest);

    if (liveData?.venues?.length) {
      const vList = liveData.venues.slice(0, 12).map(v =>
        `- ${v.name} (${v.venue_type || 'Venue'}, ${v.neighborhood || 'Columbus'}, capacity: ${v.capacity || 'varies'})`
      ).join('\n');
      prompt += `\n\nCURRENT LIVE VENUES ON CBUSEVENTS (use this to answer venue questions accurately):\n${vList}`;
    }

    if (liveData?.events?.length) {
      const eList = liveData.events.slice(0, 10).map(e => {
        const date = e.start_time ? new Date(e.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD';
        return `- ${e.title} (${e.category || 'Event'}) at ${e.venues?.name || 'Columbus'} on ${date}`;
      }).join('\n');
      prompt += `\n\nUPCOMING PUBLISHED EVENTS ON CBUSEVENTS:\n${eList}`;
    }

    if (liveData?.vendors?.length) {
      const vendorList = liveData.vendors.slice(0, 10).map(v =>
        `- ${v.business_name} (${v.category || 'Vendor'})`
      ).join('\n');
      prompt += `\n\nFEATURED VENDORS ON CBUSEVENTS:\n${vendorList}`;
    }

    return prompt;
  }

  // ── FETCH LIVE DATA ──────────────────────────────────────────────────────────
  async function fetchLiveData() {
    try {
      const headers = {
        'apikey': SB_KEY,
        'Authorization': 'Bearer ' + SB_KEY,
        'Content-Type': 'application/json',
      };

      const [venuesRes, eventsRes, vendorsRes] = await Promise.all([
        fetch(`${SB_URL}/rest/v1/venues?select=name,venue_type,neighborhood,capacity&status=eq.approved&order=rank_score.desc&limit=15`, { headers }),
        fetch(`${SB_URL}/rest/v1/events?select=title,category,start_time,venues(name)&status=eq.published&start_time=gte.${new Date().toISOString()}&order=start_time.asc&limit=12`, { headers }),
        fetch(`${SB_URL}/rest/v1/vendors?select=business_name,category&order=rank_score.desc&limit=10`, { headers }),
      ]);

      const [venues, events, vendors] = await Promise.all([
        venuesRes.ok ? venuesRes.json() : [],
        eventsRes.ok ? eventsRes.json() : [],
        vendorsRes.ok ? vendorsRes.json() : [],
      ]);

      return { venues: venues || [], events: events || [], vendors: vendors || [] };
    } catch (e) {
      return { venues: [], events: [], vendors: [] };
    }
  }

  // ── INJECT STYLES ────────────────────────────────────────────────────────────
  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #cbus-chat-trigger {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 9998;
        width: 54px;
        height: 54px;
        border-radius: 50%;
        background: linear-gradient(135deg, ${META.color}, ${META.color}cc);
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 20px ${META.colorDim}, 0 0 0 0 ${META.colorDim};
        animation: cbus-pulse-ring 3s ease-in-out infinite;
        transition: transform 0.2s;
        font-size: 22px;
        color: #fff;
      }
      #cbus-chat-trigger:hover { transform: scale(1.08); }
      #cbus-chat-trigger.open { animation: none; }

      @keyframes cbus-pulse-ring {
        0%, 100% { box-shadow: 0 4px 20px ${META.colorDim}, 0 0 0 0 ${META.colorDim}; }
        50% { box-shadow: 0 4px 28px ${META.colorDim}, 0 0 0 8px transparent; }
      }

      #cbus-chat-panel {
        position: fixed;
        bottom: 90px;
        right: 24px;
        z-index: 9999;
        width: 380px;
        max-width: calc(100vw - 32px);
        height: min(580px, calc(100dvh - 110px));
        background: #0b0b0f;
        border: 1px solid #25252f;
        border-radius: 20px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04);
        transform: scale(0.92) translateY(12px);
        opacity: 0;
        pointer-events: none;
        transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease;
        font-family: 'DM Sans', sans-serif;
      }
      #cbus-chat-panel.open {
        transform: scale(1) translateY(0);
        opacity: 1;
        pointer-events: all;
      }

      .cbus-chat-header {
        padding: 14px 18px;
        border-bottom: 1px solid #1a1a24;
        display: flex;
        align-items: center;
        gap: 10px;
        background: rgba(11,11,15,0.98);
        flex-shrink: 0;
      }
      .cbus-chat-icon {
        width: 36px; height: 36px;
        border-radius: 10px;
        background: linear-gradient(135deg, ${META.color}, ${META.color}cc);
        display: flex; align-items: center; justify-content: center;
        font-size: 16px; flex-shrink: 0;
        box-shadow: 0 2px 10px ${META.colorDim};
      }
      .cbus-chat-title {
        font-family: 'Syne', sans-serif;
        font-weight: 800;
        font-size: 15px;
        color: #e8e8f0;
      }
      .cbus-chat-title span { color: ${META.color}; }
      .cbus-chat-subtitle {
        font-size: 11px;
        color: #55556a;
        margin-top: 1px;
      }
      .cbus-status-dot { color: #22c55e; margin-right: 4px; }
      .cbus-header-actions { margin-left: auto; display: flex; gap: 6px; }
      .cbus-header-btn {
        padding: 4px 10px;
        border-radius: 20px;
        border: 1px solid #25252f;
        background: transparent;
        color: #55556a;
        font-size: 11px;
        cursor: pointer;
        font-family: 'DM Sans', sans-serif;
        transition: all 0.15s;
      }
      .cbus-header-btn:hover { color: #e8e8f0; background: #1a1a24; }

      .cbus-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px 14px;
        scrollbar-width: thin;
        scrollbar-color: ${META.colorDim} transparent;
      }
      .cbus-messages::-webkit-scrollbar { width: 3px; }
      .cbus-messages::-webkit-scrollbar-thumb { background: ${META.colorDim}; border-radius: 4px; }

      .cbus-msg-row {
        display: flex;
        margin-bottom: 12px;
        gap: 8px;
        align-items: flex-end;
        animation: cbus-fade-up 0.22s ease forwards;
      }
      @keyframes cbus-fade-up {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .cbus-msg-row.user { justify-content: flex-end; }

      .cbus-avatar {
        width: 26px; height: 26px;
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 12px; flex-shrink: 0;
      }
      .cbus-avatar.assistant {
        background: linear-gradient(135deg, ${META.color}, ${META.color}cc);
        box-shadow: 0 1px 6px ${META.colorDim};
      }
      .cbus-avatar.user { background: #1a1a24; border: 1px solid #25252f; }

      .cbus-bubble {
        max-width: 78%;
        padding: 9px 13px;
        font-size: 13.5px;
        line-height: 1.6;
        color: #e8e8f0;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .cbus-bubble.assistant {
        border-radius: 14px 14px 14px 3px;
        background: #1a1a24;
        border: 1px solid #25252f;
      }
      .cbus-bubble.user {
        border-radius: 14px 14px 3px 14px;
        background: #1a0d00;
        border: 1px solid ${META.colorBorder};
      }

      .cbus-typing {
        display: flex; align-items: flex-end; gap: 8px;
        margin-bottom: 12px;
        animation: cbus-fade-up 0.22s ease forwards;
      }
      .cbus-typing-bubble {
        background: #1a1a24;
        border: 1px solid #25252f;
        border-radius: 14px 14px 14px 3px;
        padding: 10px 14px;
        display: flex; gap: 4px; align-items: center;
      }
      .cbus-dot {
        width: 6px; height: 6px;
        border-radius: 50%;
        background: ${META.color};
        display: inline-block;
      }
      @keyframes cbus-bounce {
        0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
        40% { transform: scale(1); opacity: 1; }
      }

      .cbus-suggestions {
        padding: 0 14px 8px;
        display: flex; flex-wrap: wrap; gap: 6px;
        flex-shrink: 0;
      }
      .cbus-chip {
        padding: 5px 12px;
        border-radius: 20px;
        border: 1px solid ${META.colorBorder};
        background: ${META.colorDim};
        color: ${META.color};
        font-size: 11.5px;
        cursor: pointer;
        transition: all 0.15s;
        font-family: 'DM Sans', sans-serif;
        white-space: nowrap;
      }
      .cbus-chip:hover {
        background: ${META.colorDim};
        filter: brightness(1.3);
        transform: translateY(-1px);
      }

      .cbus-input-area {
        padding: 10px 14px 14px;
        border-top: 1px solid #1a1a24;
        background: rgba(11,11,15,0.98);
        flex-shrink: 0;
      }
      .cbus-input-box {
        display: flex;
        align-items: flex-end;
        gap: 8px;
        background: #13131a;
        border: 1px solid #25252f;
        border-radius: 12px;
        padding: 8px 8px 8px 14px;
        transition: border-color 0.15s;
      }
      .cbus-input-box:focus-within { border-color: ${META.colorBorder}; }
      .cbus-textarea {
        flex: 1;
        background: none;
        border: none;
        outline: none;
        color: #e8e8f0;
        font-size: 13.5px;
        font-family: 'DM Sans', sans-serif;
        resize: none;
        line-height: 1.5;
        max-height: 90px;
        overflow-y: auto;
      }
      .cbus-textarea::placeholder { color: #3a3a4a; }
      .cbus-send {
        width: 32px; height: 32px;
        border-radius: 8px;
        border: none;
        background: #25252f;
        color: #55556a;
        font-size: 15px;
        cursor: not-allowed;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.15s;
        flex-shrink: 0;
      }
      .cbus-send.active {
        background: linear-gradient(135deg, ${META.color}, ${META.color}cc);
        color: #fff;
        cursor: pointer;
        box-shadow: 0 2px 10px ${META.colorDim};
      }
      .cbus-send.active:hover { transform: scale(1.08); }

      .cbus-loading-bar {
        padding: 8px 14px;
        font-size: 11px;
        color: #55556a;
        text-align: center;
        flex-shrink: 0;
      }
    `;
    document.head.appendChild(style);
  }

  // ── BUILD DOM ────────────────────────────────────────────────────────────────
  function buildWidget() {
    // Trigger button
    const trigger = document.createElement('button');
    trigger.id = 'cbus-chat-trigger';
    trigger.innerHTML = '⚡';
    trigger.title = 'Ask the CBUSEVENTS AI';
    trigger.setAttribute('aria-label', 'Open AI chat');
    document.body.appendChild(trigger);

    // Panel
    const panel = document.createElement('div');
    panel.id = 'cbus-chat-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'CBUSEVENTS AI Assistant');
    panel.innerHTML = `
      <div class="cbus-chat-header">
        <div class="cbus-chat-icon">⚡</div>
        <div>
          <div class="cbus-chat-title">CBUS<span>EVENTS</span></div>
          <div class="cbus-chat-subtitle"><span class="cbus-status-dot">●</span>${META.label}</div>
        </div>
        <div class="cbus-header-actions">
          <button class="cbus-header-btn" id="cbus-clear-btn">Clear</button>
          <button class="cbus-header-btn" id="cbus-close-btn">✕</button>
        </div>
      </div>
      <div class="cbus-messages" id="cbus-messages"></div>
      <div class="cbus-suggestions" id="cbus-suggestions"></div>
      <div class="cbus-loading-bar" id="cbus-loading-bar" style="display:none">Loading live Columbus data...</div>
      <div class="cbus-input-area">
        <div class="cbus-input-box">
          <textarea class="cbus-textarea" id="cbus-textarea" placeholder="Ask anything about Columbus events..." rows="1"></textarea>
          <button class="cbus-send" id="cbus-send">↑</button>
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    return { trigger, panel };
  }

  // ── WIDGET LOGIC ─────────────────────────────────────────────────────────────
  async function init() {
    injectStyles();
    const { trigger, panel } = buildWidget();

    const messagesEl  = document.getElementById('cbus-messages');
    const suggestEl   = document.getElementById('cbus-suggestions');
    const textarea    = document.getElementById('cbus-textarea');
    const sendBtn     = document.getElementById('cbus-send');
    const clearBtn    = document.getElementById('cbus-clear-btn');
    const closeBtn    = document.getElementById('cbus-close-btn');
    const loadingBar  = document.getElementById('cbus-loading-bar');

    let isOpen    = false;
    let isBusy    = false;
    let messages  = [];
    let systemPrompt = buildSystemPrompt({});

    // Build suggestion chips
    function buildSuggestions() {
      suggestEl.innerHTML = '';
      META.suggestions.forEach(s => {
        const chip = document.createElement('button');
        chip.className = 'cbus-chip';
        chip.textContent = s;
        chip.onclick = () => {
          textarea.value = s;
          autoResize();
          updateSend();
          textarea.focus();
        };
        suggestEl.appendChild(chip);
      });
    }

    // Add message to UI
    function addMsg(role, text) {
      if (role !== 'system') messages.push({ role, content: text });

      const row = document.createElement('div');
      row.className = `cbus-msg-row ${role}`;

      if (role === 'assistant') {
        const av = document.createElement('div');
        av.className = 'cbus-avatar assistant';
        av.textContent = '⚡';
        row.appendChild(av);
      }

      const bubble = document.createElement('div');
      bubble.className = `cbus-bubble ${role}`;
      bubble.textContent = text;
      row.appendChild(bubble);

      if (role === 'user') {
        const av = document.createElement('div');
        av.className = 'cbus-avatar user';
        av.textContent = USER_NAME ? USER_NAME[0].toUpperCase() : 'U';
        row.appendChild(av);
        suggestEl.style.display = 'none';
      }

      messagesEl.appendChild(row);
      scrollBottom();
    }

    function showTyping() {
      const row = document.createElement('div');
      row.id = 'cbus-typing';
      row.className = 'cbus-typing';
      const av = document.createElement('div');
      av.className = 'cbus-avatar assistant';
      av.textContent = '⚡';
      const bubble = document.createElement('div');
      bubble.className = 'cbus-typing-bubble';
      [0, 1, 2].forEach(i => {
        const dot = document.createElement('span');
        dot.className = 'cbus-dot';
        dot.style.animation = `cbus-bounce 1.2s ease-in-out ${i * 0.2}s infinite`;
        bubble.appendChild(dot);
      });
      row.appendChild(av);
      row.appendChild(bubble);
      messagesEl.appendChild(row);
      scrollBottom();
    }

    function hideTyping() {
      const el = document.getElementById('cbus-typing');
      if (el) el.remove();
    }

    function scrollBottom() {
      messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: 'smooth' });
    }

    function autoResize() {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 90) + 'px';
    }

    function updateSend() {
      const hasText = textarea.value.trim().length > 0;
      sendBtn.classList.toggle('active', hasText && !isBusy);
      sendBtn.disabled = !hasText || isBusy;
    }

    async function send() {
      const text = textarea.value.trim();
      if (!text || isBusy) return;
      isBusy = true;
      textarea.value = '';
      autoResize();
      updateSend();
      addMsg('user', text);
      showTyping();

      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 600,
            system: systemPrompt,
            messages: messages.map(m => ({ role: m.role, content: m.content })),
          }),
        });
        const data = await res.json();
        const reply = data?.content?.[0]?.text || "Sorry, I couldn't get a response. Try refreshing.";
        hideTyping();
        addMsg('assistant', reply);
      } catch (e) {
        hideTyping();
        addMsg('assistant', 'Connection issue — please try again in a moment.');
      } finally {
        isBusy = false;
        updateSend();
        textarea.focus();
      }
    }

    function reset() {
      messages = [];
      messagesEl.innerHTML = '';
      suggestEl.style.display = '';
      buildSuggestions();
      addMsg('assistant', META.greeting);
    }

    function togglePanel() {
      isOpen = !isOpen;
      panel.classList.toggle('open', isOpen);
      trigger.classList.toggle('open', isOpen);
      trigger.innerHTML = isOpen ? '✕' : '⚡';
      if (isOpen) setTimeout(() => textarea.focus(), 300);
    }

    // Events
    trigger.addEventListener('click', togglePanel);
    closeBtn.addEventListener('click', togglePanel);
    clearBtn.addEventListener('click', reset);
    sendBtn.addEventListener('click', send);
    textarea.addEventListener('input', () => { autoResize(); updateSend(); });
    textarea.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });

    // Init greeting + suggestions
    buildSuggestions();
    addMsg('assistant', META.greeting);
    updateSend();

    // Fetch live data and update system prompt silently
    loadingBar.style.display = 'block';
    fetchLiveData().then(liveData => {
      loadingBar.style.display = 'none';
      systemPrompt = buildSystemPrompt(liveData);
    }).catch(() => {
      loadingBar.style.display = 'none';
    });
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
