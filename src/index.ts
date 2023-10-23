const MY_DOMAIN = "benmix.com";
const PAGE_HOME = "55613ba9744442869f2666145353aa4c";

const PAGE_TITLE = "BenMix's Blog";
const PAGE_DESCRIPTION = "None";

function generateSitemap() {
  let sitemap =
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://' +
    MY_DOMAIN +
    "</loc></url></urlset>";
  return sitemap;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function handleOptions(request: Request) {
  if (
    request.headers.get("Origin") !== null &&
    request.headers.get("Access-Control-Request-Method") !== null &&
    request.headers.get("Access-Control-Request-Headers") !== null
  ) {
    // Handle CORS pre-flight request.
    return new Response(null, {
      headers: corsHeaders,
    });
  } else {
    // Handle standard OPTIONS request.
    return new Response(null, {
      headers: {
        Allow: "GET, HEAD, POST, PUT, OPTIONS",
      },
    });
  }
}

function rewriteHostName(hostname: string) {
  if (hostname.startsWith("exp.")) {
    return hostname.replace(MY_DOMAIN, "notion.so");
  }

  return "www.notion.so";
}

async function fetchAndApply(request: Request) {
  if (request.method === "OPTIONS") {
    return handleOptions(request);
  }
  let url = new URL(request.url);
  url.hostname = rewriteHostName(url.hostname);
  if (url.pathname === "/robots.txt") {
    return new Response("Sitemap: https://" + MY_DOMAIN + "/sitemap.xml");
  }
  if (url.pathname === "/sitemap.xml") {
    let response = new Response(generateSitemap());
    response.headers.set("content-type", "application/xml");
    return response;
  }
  let response;
  if (url.pathname.startsWith("/app") && url.pathname.endsWith("js")) {
    response = await fetch(url.toString());
    let body = await response.text();
    response = new Response(
      body
        .replace(/www.notion.so/g, MY_DOMAIN)
        .replace(/notion.so/g, MY_DOMAIN),
      response
    );
    response.headers.set("Content-Type", "application/x-javascript");
    return response;
  } else if (url.pathname.startsWith("/api")) {
    // Forward API
    response = await fetch(url.toString(), {
      body: url.pathname.startsWith("/api/v3/getPublicPageData")
        ? null
        : request.body,
      headers: {
        "content-type": "application/json;charset=UTF-8",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.163 Safari/537.36",
      },
      method: "POST",
    });
    response = new Response(response.body, response);
    response.headers.set("Access-Control-Allow-Origin", "*");
    return response;
  } else if (url.pathname.endsWith(".js")) {
    response = await fetch(url.toString());
    let body = await response.text();
    response = new Response(body, response);
    response.headers.set("Content-Type", "application/x-javascript");
    return response;
  } else if (url.pathname.slice(1) === "") {
    return Response.redirect(`https://${MY_DOMAIN}/${PAGE_HOME}`, 301);
  } else {
    response = await fetch(url.toString(), {
      body: request.body,
      headers: request.headers,
      method: request.method,
    });
    response = new Response(response.body, response);
    response.headers.delete("Content-Security-Policy");
    response.headers.delete("X-Content-Security-Policy");
  }

  return appendJavascript(response);
}

class MetaRewriter {
  element(element: Element) {
    if (
      element.getAttribute("property") === "og:title" ||
      element.getAttribute("name") === "twitter:title"
    ) {
      element.setAttribute("content", PAGE_TITLE);
    }
    if (element.tagName === "title") {
      element.setInnerContent(PAGE_TITLE);
    }
    if (
      element.getAttribute("name") === "description" ||
      element.getAttribute("property") === "og:description" ||
      element.getAttribute("name") === "twitter:description"
    ) {
      element.setAttribute("content", PAGE_DESCRIPTION);
    }
    if (
      element.getAttribute("property") === "og:url" ||
      element.getAttribute("name") === "twitter:url"
    ) {
      element.setAttribute("content", MY_DOMAIN);
    }
    if (element.getAttribute("name") === "apple-itunes-app") {
      element.remove();
    }
  }
}

class HeadRewriter {
  element(element: Element) {
    element.append(
      `<style>
      div.notion-topbar > div > div,
      div.notion-topbar-mobile > div { visibility: hidden }
      div.notion-topbar > div > div.github-button,
      div.notion-topbar > div > div.toggle-mode,
      div.notion-topbar > div > div.notranslate,
      div.notion-topbar-mobile > div.github-button,
      div.notion-topbar-mobile > div.notranslate,
      div.notion-topbar-mobile > div.toggle-mode { visibility: visible }
      .toggle-mode { display: flex; align-items: center; }
      .github-button { display: flex; align-items: center; cursor: pointer; margin-left: 8px }
      .github-icon::before { background: url("data:image/svg+xml;charset=utf-8,%3Csvg viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill='%23fff' d='M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12'/%3E%3C/svg%3E") no-repeat; content: ""; display: flex; height: 24px; width: 24px;}
      .github-icon { display: inline-block; filter: invert(1);}
      .dark .github-icon { display: inline-block; filter: none; }
      </style>`,
      {
        html: true,
      }
    );
  }
}

class BodyRewriter {
  element(element: Element) {
    element.append(
      `
      <script>
	  window.CONFIG.domainBaseUrl = 'https://${MY_DOMAIN}';
    localStorage.__console = true;
	  const PAGE_HOME = "${PAGE_HOME}";
      const el = document.createElement('div');
      let redirected = false;
      function getPage() {
        return location.pathname.slice(-32);
      }
      function getPath() {
        return location.pathname.slice(1);
      }
	    function replaceHomePath() {
        if (getPage() === PAGE_HOME) {
          history.replaceState(history.state, '', '/');
        }
      }
      function onDark() {
        el.innerHTML = '<button title="Switch between dark and light mode (currently dark mode)" type="button" aria-label="Switch between dark and light mode (currently dark mode)" aria-live="polite" style="border-radius: 50%; margin: 0px 20px; height: 24px; transition: background 200ms;border: none;background-color: #333; cursor: pointer;font-family: inherit; padding: 0;"><svg viewBox="0 0 24 24" width="24" height="24"><path d="M9.37,5.51C9.19,6.15,9.1,6.82,9.1,7.5c0,4.08,3.32,7.4,7.4,7.4c0.68,0,1.35-0.09,1.99-0.27C17.45,17.19,14.93,19,12,19 c-3.86,0-7-3.14-7-7C5,9.07,6.81,6.55,9.37,5.51z M12,3c-4.97,0-9,4.03-9,9s4.03,9,9,9s9-4.03,9-9c0-0.46-0.04-0.92-0.1-1.36 c-0.98,1.37-2.58,2.26-4.4,2.26c-2.98,0-5.4-2.42-5.4-5.4c0-1.81,0.89-3.42,2.26-4.4C12.92,3.04,12.46,3,12,3L12,3z" fill="#e3e3e3"></path></svg></button>';
        document.body.classList.add('dark');
        __console.environment.ThemeStore.setState({ mode: 'dark' });
      };
      function onLight() {
        el.innerHTML = '<button title="Switch between dark and light mode (currently light mode)" type="button" aria-label="Switch between dark and light mode (currently light mode)" aria-live="polite" style="border-radius: 50%; margin: 0px 20px; height: 24px; transition: background 200ms;border: none;background-color: #fff;cursor: pointer;font-family: inherit; padding: 0;"><svg viewBox="0 0 24 24" width="24" height="24"><path fill="#333" d="M12,9c1.65,0,3,1.35,3,3s-1.35,3-3,3s-3-1.35-3-3S10.35,9,12,9 M12,7c-2.76,0-5,2.24-5,5s2.24,5,5,5s5-2.24,5-5 S14.76,7,12,7L12,7z M2,13l2,0c0.55,0,1-0.45,1-1s-0.45-1-1-1l-2,0c-0.55,0-1,0.45-1,1S1.45,13,2,13z M20,13l2,0c0.55,0,1-0.45,1-1 s-0.45-1-1-1l-2,0c-0.55,0-1,0.45-1,1S19.45,13,20,13z M11,2v2c0,0.55,0.45,1,1,1s1-0.45,1-1V2c0-0.55-0.45-1-1-1S11,1.45,11,2z M11,20v2c0,0.55,0.45,1,1,1s1-0.45,1-1v-2c0-0.55-0.45-1-1-1C11.45,19,11,19.45,11,20z M5.99,4.58c-0.39-0.39-1.03-0.39-1.41,0 c-0.39,0.39-0.39,1.03,0,1.41l1.06,1.06c0.39,0.39,1.03,0.39,1.41,0s0.39-1.03,0-1.41L5.99,4.58z M18.36,16.95 c-0.39-0.39-1.03-0.39-1.41,0c-0.39,0.39-0.39,1.03,0,1.41l1.06,1.06c0.39,0.39,1.03,0.39,1.41,0c0.39-0.39,0.39-1.03,0-1.41 L18.36,16.95z M19.42,5.99c0.39-0.39,0.39-1.03,0-1.41c-0.39-0.39-1.03-0.39-1.41,0l-1.06,1.06c-0.39,0.39-0.39,1.03,0,1.41 s1.03,0.39,1.41,0L19.42,5.99z M7.05,18.36c0.39-0.39,0.39-1.03,0-1.41c-0.39-0.39-1.03-0.39-1.41,0l-1.06,1.06 c-0.39,0.39-0.39,1.03,0,1.41s1.03,0.39,1.41,0L7.05,18.36z"></path></svg></button>';
        document.body.classList.remove('dark');
        __console.environment.ThemeStore.setState({ mode: 'light' });
      }
      function toggle() {
        if (!__console.isEnabled) __console.enable();
        if (document.body.classList.contains('dark')) {
          onLight();
        } else {
          onDark();
        }
      }
	  function addDarkModeButtonAndGithubLink(device) {
        const nav = device === 'web' ? document.querySelector('.notion-topbar').firstChild : document.querySelector('.notion-topbar-mobile');
        const gb_el = document.createElement('div');
        
        gb_el.innerHTML = '<a href="https://github.com/c-dao" target="_blank" rel="noopener noreferrer" class="github-icon" aria-label="GitHub"></a>';
        gb_el.className = 'github-button';
        nav.appendChild(gb_el); 

        el.className = 'toggle-mode';
        el.addEventListener('click', toggle);
        nav.appendChild(el);
        if(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)')){
          onDark();  
        }else{
          onLight();
        };
      }
      const observer = new MutationObserver(function() {
        if (redirected) return;
        const nav = document.querySelector('.notion-topbar');
        const mobileNav = document.querySelector('.notion-topbar-mobile');
        if (nav && nav.firstChild && nav.firstChild.firstChild
          || mobileNav && mobileNav.firstChild) {
          redirected = true;
          replaceHomePath();
		  addDarkModeButtonAndGithubLink(nav ? 'web' : 'mobile');
          window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
              if(event.matchs == 'dark'){
                  onDark()
              }else{
                  onLight();
              }
          });
		  const onpopstate = window.onpopstate;
          window.onpopstate = function() {
          if (getPath() === '') {
                history.replaceState(history.state, 'bypass', '/' + PAGE_HOME);
            }
            onpopstate.apply(this, [].slice.call(arguments));
            replaceHomePath();
          };
        }
      });
      observer.observe(document.querySelector('#notion-app'), {
        childList: true,
        subtree: true,
      });
      const replaceState = window.history.replaceState;
      window.history.replaceState = function(state) {
        if (arguments[1] !== 'bypass' && getPage() === PAGE_HOME) return;
        return replaceState.apply(window.history, arguments);
      };
      const pushState = window.history.pushState;
      window.history.pushState = function(state) {
        if (getPage() === PAGE_HOME) {
          arguments[2] = '/';
        }
        return pushState.apply(window.history, arguments);
      };
      const open = window.XMLHttpRequest.prototype.open;
      window.XMLHttpRequest.prototype.open = function() {
        if (arguments[1].includes('msgstore.www.notion.so')) return;
        arguments[1] = arguments[1].replace('${MY_DOMAIN}', 'www.notion.so');
        return open.apply(this, [].slice.call(arguments));
      };
      const originFetch = window.fetch;
      window.fetch = async (...args)=>{
        if (args[0].includes('exp')) return;
        return originFetch(...args);
      }
    </script>`,
      {
        html: true,
      }
    );
  }
}

async function appendJavascript(response: Response) {
  return new HTMLRewriter()
    .on("title", new MetaRewriter())
    .on("meta", new MetaRewriter())
    .on("head", new HeadRewriter())
    .on("body", new BodyRewriter())
    .transform(response);
}

export default {
  async fetch(request: Request): Promise<Response> {
    return fetchAndApply(request);
  },
};
