/* ============================================================
   CBUSEVENTS - SHELL SPINE
   cbus-shell.js - the single source for the public nav + footer.

   Edit the NAV / FOOTER models below once; every public page that
   includes this script updates. Styling lives in cbus.css (section 14).

   USAGE on any PUBLIC page (not the dark logged-in portals):
     In <head>:
       <link rel="stylesheet" href="/cbus.css">
       <link rel="stylesheet" href="/theme.css">
       <script src="/theme.js"></script>
     Before </body>:
       <div id="cb-nav"></div>      <!-- nav mounts here (top)   -->
       <div id="cb-footer"></div>   <!-- footer mounts here (end) -->
       <script src="/cbus-shell.js" defer></script>

   If the mount divs are absent the nav prepends to <body> and the
   footer appends to it, so the script is safe to drop in either way.
   Remove the page's old <nav> and <footer> when you wire it in.
   ============================================================ */
(function () {
  'use strict';

  var BASE = 'https://cbusevents.com';
  var U = function (p) { return p.charAt(0) === '#' ? p : BASE + '/' + p.replace(/^\//, ''); };

  /* ---- NAV MODEL : the 8-group spine, grouped by who's arriving ---- */
  var NAV = [
    {
      id: 'discover', label: 'Discover',
      match: ['attendees.html', 'the-radar.html', 'communities.html', 'community.html', 'marketplace.html', 'blog.html', 'article.html'],
      panel: [
        { href: 'attendees.html', label: 'All Events', lead: true },
        { href: 'the-radar.html', label: 'The Radar', sub: 'Live map discovery' },
        { href: 'communities.html', label: 'Communities' },
        { href: 'marketplace.html', label: 'Marketplace' },
        { div: true },
        { href: 'blog.html', label: 'Columbus Blog' }
      ]
    },
    {
      id: 'business', label: 'For Business',
      match: ['venues.html', 'list-your-venue.html', 'vendors.html', 'food-professional.html',
              'organizers.html', 'creators.html', 'brands.html'],
      panel: [
        { glabel: 'Source' },
        { href: 'list-your-venue.html', label: 'List Your Venue', lead: true, stage: 'Start here' },
        { href: 'venues.html', label: 'Venues' },
        { glabel: 'Assemble' },
        { href: 'vendors.html', label: 'Vendors' },
        { href: 'food-professional.html', label: 'Food Professionals' },
        { glabel: 'Operate' },
        { href: 'organizers.html', label: 'Event Organizers' },
        { glabel: 'Demand' },
        { href: 'creators.html', label: 'Creators' },
        { glabel: 'Experiential' },
        { href: 'brands.html', label: 'Brands & Agencies' }
      ]
    },
    {
      id: 'refer', label: 'Refer & Earn', href: 'sales-landing.html',
      match: ['sales-landing.html', 'brand-rep.html', 'brand-rep-signup.html']
    }
  ];

  /* ---- FOOTER MODEL ---- */
  var FOOT = [
    { h: 'Discover', links: [
      ['attendees.html', 'All Events'], ['the-radar.html', 'The Radar'],
      ['communities.html', 'Communities'], ['marketplace.html', 'Marketplace'],
      ['blog.html', 'Columbus Blog']
    ]},
    { h: 'For Business', links: [
      ['list-your-venue.html', 'List Your Venue'], ['vendors.html', 'Vendors'],
      ['food-professional.html', 'Food Professionals'], ['organizers.html', 'Organizers'],
      ['creators.html', 'Creators'], ['brands.html', 'Brands & Agencies']
    ]},
    { h: 'Partner', links: [
      ['sales-landing.html', 'Refer & Earn'], ['collab-board.html', 'Gig Board'],
      ['feature-your-spot.html', 'Feature Your Spot']
    ]},
    { h: 'Account', links: [
      ['signup.html', 'Join CBUS Events'], ['auth.html', 'Sign In'],
      ['customer-portal.html', 'My Tickets']
    ]}
  ];

  var LEGAL = [['privacy.html', 'Privacy'], ['terms.html', 'Terms']];

  /* ---- active section by current filename ---- */
  var here = (window.location.pathname.split('/').pop() || 'index.html') || 'index.html';
  function isCurrent(item) {
    if (item.href && item.href.replace(/^\//, '') === here) return true;
    return (item.match || []).indexOf(here) !== -1;
  }

  /* ---- build nav markup ---- */
  function optHTML(o) {
    if (o.div) return '<div class="cb-shell-pdiv"></div>';
    if (o.glabel) return '<div class="cb-shell-group-label">' + o.glabel + '</div>';
    var cls = 'cb-shell-opt' + (o.lead ? ' lead' : '');
    var inner = o.label + (o.stage ? '<span class="stage">' + o.stage + '</span>' : '');
    if (o.sub) inner += '<span class="sub">' + o.sub + '</span>';
    return '<a class="' + cls + '" href="' + U(o.href) + '">' + inner + '</a>';
  }

  function navHTML() {
    var items = NAV.map(function (it) {
      var cur = isCurrent(it) ? ' current' : '';
      if (it.href && !it.panel) {
        return '<div class="cb-shell-item"><a class="cb-shell-link' + cur + '" href="' + U(it.href) + '">' + it.label + '</a></div>';
      }
      var panel = it.panel.map(optHTML).join('');
      return '<div class="cb-shell-item" data-dd="' + it.id + '">' +
        '<button class="cb-shell-link' + cur + '" aria-haspopup="true" aria-expanded="false">' +
        it.label + '<span class="cb-shell-caret">\u25BC</span></button>' +
        '<div class="cb-shell-panel">' + panel + '</div></div>';
    }).join('');

    return '<nav class="cb-shell-nav"><div class="cb-shell-bar">' +
      '<a class="cb-shell-logo" href="' + BASE + '">CBUS<span>EVENTS</span></a>' +
      '<div class="cb-shell-links">' + items + '</div>' +
      '<div class="cb-shell-right">' +
        '<button class="cb-shell-toggle" aria-label="Toggle dark mode" data-cb-toggle>' +
          '<span class="theme-icon-moon">\u263E</span><span class="theme-icon-sun">\u2600</span></button>' +
        '<a class="cb-shell-signin" href="' + U('auth.html') + '">Sign In</a>' +
        '<a class="cb-btn cb-btn-sm" href="' + U('signup.html') + '">Join</a>' +
        '<button class="cb-shell-burger" aria-label="Menu" data-cb-burger>' +
          '<span></span><span></span><span></span></button>' +
      '</div></div>' + drawerHTML() + '</nav>';
  }

  function drawerHTML() {
    var groups = NAV.map(function (it) {
      var opts;
      if (it.panel) {
        opts = it.panel.filter(function (o) { return o.href; }).map(function (o) {
          return '<a class="dopt" href="' + U(o.href) + '">' + o.label +
            (o.stage ? '<span class="stage">' + o.stage + '</span>' : '') + '</a>';
        }).join('');
      } else {
        opts = '<a class="dopt" href="' + U(it.href) + '">' + it.label + '</a>';
      }
      return '<div class="dgroup"><div class="dlabel">' + it.label + '</div>' + opts + '</div>';
    }).join('');
    return '<div class="cb-shell-drawer" data-cb-drawer>' + groups +
      '<div class="dcta"><a class="cb-btn-outline" href="' + U('auth.html') + '">Sign In</a>' +
      '<a class="cb-btn" href="' + U('signup.html') + '">Join</a></div></div>';
  }

  function footHTML() {
    var cols = FOOT.map(function (c) {
      var links = c.links.map(function (l) { return '<a href="' + U(l[0]) + '">' + l[1] + '</a>'; }).join('');
      return '<div class="cb-shell-foot-col"><h4>' + c.h + '</h4>' + links + '</div>';
    }).join('');
    var legal = LEGAL.map(function (l) { return '<a href="' + U(l[0]) + '">' + l[1] + '</a>'; }).join('');
    var yr = new Date().getFullYear();
    return '<footer class="cb-shell-foot"><div class="cb-shell-foot-inner">' +
      '<div class="cb-shell-foot-grid">' +
        '<div class="cb-shell-foot-col brand">' +
          '<div class="cb-shell-foot-logo">CBUS<span>EVENTS</span></div>' +
          '<div class="cb-shell-foot-tag">United by events</div>' +
          '<p class="cb-shell-foot-desc">The operating layer for the Columbus event economy. ' +
          'Venues, vendors, organizers, creators, and attendees in one place.</p></div>' +
        cols +
      '</div>' +
      '<div class="cb-shell-foot-base"><span class="meta">\u00A9 ' + yr +
        ' CBUS Events LLC \u00B7 Columbus, Ohio</span>' +
        '<span class="legal">' + legal + '</span></div>' +
      '</div></footer>';
  }

  /* ---- inject ---- */
  function mount() {
    var navRoot = document.getElementById('cb-nav');
    var footRoot = document.getElementById('cb-footer');
    if (navRoot) { navRoot.outerHTML = navHTML(); }
    else { document.body.insertAdjacentHTML('afterbegin', navHTML()); }
    if (footRoot) { footRoot.outerHTML = footHTML(); }
    else { document.body.insertAdjacentHTML('beforeend', footHTML()); }
    wire();
  }

  /* ---- interactions ---- */
  function wire() {
    var items = Array.prototype.slice.call(document.querySelectorAll('.cb-shell-item[data-dd]'));
    items.forEach(function (item) {
      var btn = item.querySelector('.cb-shell-link');
      var open = function () { closeAll(item); item.classList.add('open'); btn.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); };
      var close = function () { item.classList.remove('open'); btn.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); };
      btn.addEventListener('click', function (e) { e.stopPropagation(); item.classList.contains('open') ? close() : open(); });
      item.addEventListener('mouseenter', open);
      item.addEventListener('mouseleave', close);
    });
    document.addEventListener('click', function () { closeAll(null); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeAll(null); closeDrawer(); } });

    var burger = document.querySelector('[data-cb-burger]');
    var drawer = document.querySelector('[data-cb-drawer]');
    if (burger && drawer) {
      burger.addEventListener('click', function (e) {
        e.stopPropagation();
        var o = drawer.classList.toggle('open');
        burger.classList.toggle('open', o);
        document.body.style.overflow = o ? 'hidden' : '';
      });
    }

    var toggle = document.querySelector('[data-cb-toggle]');
    if (toggle) {
      toggle.addEventListener('click', function () {
        if (window.CBUSTheme && typeof window.CBUSTheme.toggle === 'function') window.CBUSTheme.toggle();
        else if (typeof window.toggleTheme === 'function') window.toggleTheme();
      });
    }
  }
  function closeAll(except) {
    document.querySelectorAll('.cb-shell-item.open').forEach(function (i) {
      if (i === except) return;
      i.classList.remove('open');
      var b = i.querySelector('.cb-shell-link'); if (b) { b.classList.remove('open'); b.setAttribute('aria-expanded', 'false'); }
    });
  }
  function closeDrawer() {
    var d = document.querySelector('[data-cb-drawer]'), b = document.querySelector('[data-cb-burger]');
    if (d) d.classList.remove('open'); if (b) b.classList.remove('open'); document.body.style.overflow = '';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
