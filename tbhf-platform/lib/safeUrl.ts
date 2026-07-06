/**
 * SECURITY (BUG-006): sanitize a user-supplied URL before using it as an <a href>.
 *
 * Values like linkedin_url, an opportunity's application link, research/resource
 * links, showcase external_url and event recording/registration links are entered
 * by members/admins and rendered directly into href. Without a scheme check, a
 * value of `javascript:...` (or data:/vbscript:) executes script when another
 * user — including an admin reviewing content — clicks the link.
 *
 * Allows http(s), mailto, tel and site-relative URLs. Anything else returns
 * undefined so the caller renders a link with no href (a harmless dead link).
 */
export function safeUrl(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  // Browsers strip tab/newline/CR from URLs before parsing the scheme, so an
  // attacker could smuggle "java\tscript:" past a naive check. Strip them too.
  const url = raw.replace(/[\t\n\r]/g, "").trim();
  if (!url) return undefined;

  // Site-relative / fragment / query-only URLs are same-origin and safe.
  if (/^[/#?]/.test(url)) return url;

  const match = /^([a-z][a-z0-9+.-]*):/i.exec(url);
  // No scheme -> not an absolute script URL; leave it for the browser to resolve.
  if (!match) return url;

  const scheme = match[1].toLowerCase();
  return ["http", "https", "mailto", "tel"].includes(scheme) ? url : undefined;
}
