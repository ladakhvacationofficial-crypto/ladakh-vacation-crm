/**
 * Ladakh Vacation landing-page beacon. Drop this file on any marketing page:
 *
 *   <script src="https://<your-frontend>/lv-track.js"
 *           data-api="https://<your-backend>/api"
 *           data-slug="ladakh-honeymoon-packages"></script>
 *
 * On load it:
 *   1. Reads (or mints) a first-party visitorId — 1-year cookie.
 *   2. Reads (or mints) a sessionId — 30-min sliding cookie.
 *   3. Parses UTMs + gclid + fbclid off the current URL.
 *   4. POSTs to /api/visits and stashes the returned visitId on window.lvTrack.
 *
 * When your form submits, include window.lvTrack.visitId — the backend then
 * ties the lead to the visit and copies the attribution over. Example:
 *
 *   fetch(API + '/leads/capture', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({
 *       name: form.name.value,
 *       phone: form.phone.value,
 *       visitId: (window.lvTrack || {}).visitId,   // <- the important bit
 *       source: 'LANDING_PAGE',
 *     }),
 *   });
 *
 * You can also call window.lvTrack.attach(formElement) and it will inject a
 * hidden <input name="visitId"> for you.
 */
(function () {
  var script = document.currentScript;
  if (!script) return;
  var API = script.getAttribute('data-api');
  var SLUG = script.getAttribute('data-slug') || location.pathname;
  if (!API) return;

  // ---- cookies ----------------------------------------------------------
  // We deliberately use first-party cookies (not localStorage) so a normal
  // page navigation carries them and ad blockers don't nuke them.
  function readCookie(name) {
    var m = document.cookie.match('(?:^|; )' + name + '=([^;]+)');
    return m ? decodeURIComponent(m[1]) : null;
  }
  function writeCookie(name, value, days) {
    var exp = new Date(Date.now() + days * 864e5).toUTCString();
    // SameSite=Lax so the cookie survives clicks from Google/Meta ads.
    document.cookie =
      name + '=' + encodeURIComponent(value) +
      '; expires=' + exp + '; path=/; SameSite=Lax';
  }
  function uid() {
    // 22 chars, URL-safe. Not crypto-grade — attribution IDs don't need to be.
    return (
      Date.now().toString(36) +
      Math.random().toString(36).slice(2, 12) +
      Math.random().toString(36).slice(2, 6)
    );
  }

  var visitorId = readCookie('glz_v') || uid();
  writeCookie('glz_v', visitorId, 365);

  // Session: fresh id every 30 minutes of inactivity. We piggyback the exp
  // on the cookie itself — every page load bumps it back to 30 minutes.
  var sessionId = readCookie('glz_s') || uid();
  writeCookie('glz_s', sessionId, 1 / 48); // 30 minutes = 1/48 of a day

  // ---- attribution off the URL -----------------------------------------
  function param(name) {
    var p = new URLSearchParams(location.search);
    var v = p.get(name);
    return v ? v.slice(0, 200) : undefined;
  }

  var payload = {
    visitorId: visitorId,
    sessionId: sessionId,
    pagePath: SLUG,
    utmSource: param('utm_source'),
    utmMedium: param('utm_medium'),
    utmCampaign: param('utm_campaign'),
    utmTerm: param('utm_term'),
    utmContent: param('utm_content'),
    gclid: param('gclid'),
    fbclid: param('fbclid'),
    keyword: param('keyword') || param('q'),
    referrer: document.referrer ? document.referrer.slice(0, 500) : undefined,
  };

  // Strip undefineds — the backend DTO uses @IsOptional() which accepts
  // missing keys but not the string "undefined".
  Object.keys(payload).forEach(function (k) {
    if (payload[k] === undefined) delete payload[k];
  });

  // ---- fire ------------------------------------------------------------
  window.lvTrack = { visitorId: visitorId, sessionId: sessionId, visitId: null };

  fetch(API + '/visits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    // credentials omitted — the backend does not read cookies for /visits.
    keepalive: true, // survives fast navigations
  })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (!data) return;
      window.lvTrack.visitId = data.visitId;
      // Late attach: if any form was marked before /visits responded, fill it.
      document
        .querySelectorAll('form[data-lv-attached] input[name=visitId]')
        .forEach(function (el) { el.value = data.visitId; });
    })
    .catch(function () { /* silent — we never break the page for tracking */ });

  // ---- helper for the form ---------------------------------------------
  window.lvTrack.attach = function (form) {
    if (!form || form.dataset.lvAttached) return;
    var input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'visitId';
    input.value = window.lvTrack.visitId || '';
    form.appendChild(input);
    form.dataset.lvAttached = '1';
  };
})();
