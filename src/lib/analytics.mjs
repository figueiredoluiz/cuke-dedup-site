// Shared by astro.config.mjs (Starlight head) and BaseLayout.astro so the
// docs and the custom pages run the exact same analytics bootstrap.
export const GA_MEASUREMENT_ID = 'G-LPQTNFBH3X';
export const GA_PRODUCTION_DOMAIN = 'cukededup.dev';

// Loads gtag.js only when the page is actually served from the production
// domain, so dev, preview, and off-domain builds stay completely clean.
export const gaBootstrapScript = (measurementId) =>
  '(function(){' +
  `if(location.hostname!=='${GA_PRODUCTION_DOMAIN}')return;` +
  'window.dataLayer=window.dataLayer||[];' +
  'function gtag(){dataLayer.push(arguments);}' +
  "var s=document.createElement('script');" +
  's.async=true;' +
  `s.src='https://www.googletagmanager.com/gtag/js?id=${measurementId}';` +
  'document.head.appendChild(s);' +
  "gtag('js',new Date());" +
  `gtag('config','${measurementId}');` +
  '})();';

// Surfaces docs-search terms (Pagefind input) as GA `search` events.
export const gaSearchEventScript =
  '(function(){var t=null,last="";document.addEventListener("input",function(e){var el=e.target;' +
  'if(!(el&&el.matches&&el.matches(\'input[type="search"]\')))return;var term=(el.value||"").trim();' +
  'clearTimeout(t);t=setTimeout(function(){if(term&&term!==last&&window.gtag){window.gtag("event",' +
  '"search",{search_term:term});last=term;}},800);},true);})();';
