/**
 * Absolute URLs back into the app, for links that leave it and return.
 *
 * `window.location.origin` is only the scheme and host -- it never carries a
 * path. On a host that serves the app from a subpath, building a redirect from
 * origin alone lands one directory too high: a password reset pointed at
 * pengioapp.github.io/reset-password rather than /pengio/reset-password, which
 * is a genuine 404 with no app on it. Anything Supabase emails out has to go
 * through here.
 */
export const buildAppUrl = (origin: string, base: string, path = ""): string => {
  // BASE_URL is "/" at the domain root and "/pengio/" on GitHub Pages.
  const root = `${origin}${base}`.replace(/\/+$/, "");
  const tail = path.replace(/^\/+/, "");
  return tail ? `${root}/${tail}` : root;
};

export const appUrl = (path = ""): string =>
  buildAppUrl(window.location.origin, import.meta.env.BASE_URL, path);
