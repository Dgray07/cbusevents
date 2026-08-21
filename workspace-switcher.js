/* CBUS Events — workspace switcher
   Fills the existing dead call site: window.CBUSAccount.mountSwitcher(...)
   already referenced in index.html but never implemented.

   Reads the SAME table already used correctly in cbus-vendor-portal.html
   and cbus-venue-portal.html: user_roles (one row per user per role).
   Does NOT touch organizer_profiles/vendors/venues existence checks —
   those auto-create rows on first visit and are not a reliable signal.

   Include on every page that should show the switcher:
   <script src="/workspace-switcher.js"></script>
   ...then after auth resolves:
   CBUSAccount.init(sb);
   CBUSAccount.mountSwitcher(mountEl, userId, currentRoleOrNull);
*/
(function(){
  var ROLE_META = {
    organizer: { label: 'Organizer', url: 'cbus-organizer-portal.html' },
    vendor:    { label: 'Vendor',    url: 'cbus-vendor-portal.html' },
    venue_owner:{ label: 'Venue',    url: 'cbus-venue-portal.html' },
    customer:  { label: 'My Events', url: 'customer-portal.html' }
  };
  var _sb = null;

  function init(sbClient){ _sb = sbClient; }

  async function getRoles(userId){
    if(!_sb || !userId) return [];
    try{
      var res = await _sb.from('user_roles').select('role').eq('user_id', userId);
      var rows = res.data || [];
      var roles = rows.map(function(r){ return r.role; });
      // Everyone with an account can browse/attend — always offer My Events
      // even if they have no explicit 'customer' row.
      if(roles.indexOf('customer') === -1) roles.push('customer');
      window._userRoles = roles;
      return roles;
    }catch(e){
      console.warn('[workspace-switcher] role fetch failed', e);
      return ['customer'];
    }
  }

  function currentFileRole(){
    var path = window.location.pathname;
    if(path.indexOf('organizer-portal') > -1) return 'organizer';
    if(path.indexOf('vendor-portal') > -1) return 'vendor';
    if(path.indexOf('venue-portal') > -1) return 'venue_owner';
    if(path.indexOf('customer-portal') > -1) return 'customer';
    return null;
  }

  async function mountSwitcher(container, userId, explicitRole){
    if(!container) return;
    var roles = await getRoles(userId);
    var active = explicitRole || currentFileRole() || roles[0] || 'customer';
    var activeMeta = ROLE_META[active] || ROLE_META.customer;

    // Single role: no dropdown needed, just a plain label — no dead UI
    // pretending there's a choice when there isn't one.
    if(roles.length <= 1){
      container.innerHTML = '<span class="ws-chip ws-chip--static">'+activeMeta.label+'</span>';
      return;
    }

    var html = '<div class="ws-switcher">'
      + '<button class="ws-chip" id="wsTrigger" aria-haspopup="true" aria-expanded="false">'
      +   '<span class="ws-chip-label">'+activeMeta.label+'</span>'
      +   '<span class="ws-chip-caret">▾</span>'
      + '</button>'
      + '<div class="ws-menu" id="wsMenu" style="display:none">'
      +   roles.map(function(r){
            var meta = ROLE_META[r];
            if(!meta) return '';
            var isActive = r === active;
            return '<a class="ws-menu-item'+(isActive?' ws-menu-item--active':'')+'" href="https://cbusevents.com/'+meta.url+'">'
              + meta.label
              + (isActive ? '<span class="ws-menu-check">✓</span>' : '')
              + '</a>';
          }).join('')
      + '</div>'
      + '</div>';

    container.innerHTML = html;

    var trigger = document.getElementById('wsTrigger');
    var menu = document.getElementById('wsMenu');
    if(trigger && menu){
      trigger.addEventListener('click', function(e){
        e.stopPropagation();
        var open = menu.style.display !== 'none';
        menu.style.display = open ? 'none' : 'block';
        trigger.setAttribute('aria-expanded', String(!open));
      });
      document.addEventListener('click', function(){
        menu.style.display = 'none';
        trigger.setAttribute('aria-expanded', 'false');
      });
    }
  }

  window.CBUSAccount = { init: init, mountSwitcher: mountSwitcher, ROLE_META: ROLE_META };
})();
