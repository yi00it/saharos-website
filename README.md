# Saharos — Marketing Website

The public landing page for [Saharos](https://saharos.com), construction project management in closed alpha.

Plain static HTML, CSS and JavaScript — no build step, no dependencies.

```
index.html     Page markup
landing.css    Styles (light + dark mode)
landing.js     Scroll scenes, product tour, live CPM demo, access form
images/        Product screenshots
.nojekyll      Tells GitHub Pages to serve files as-is
```

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy

Served by GitHub Pages from the root of `main`. Every push to `main` publishes automatically.

## Access form

The "Request access" form posts to the Saharos API:

```
POST https://api.saharos.com/api/waitlist
{ "name", "email", "company", "role" }
```

The endpoint is set on the form's `data-endpoint` attribute in `index.html`.
The site's origin (for example `https://yi00it.github.io` or `https://saharos.com`)
must be listed in the API's `CORS_ALLOWED_ORIGINS`, otherwise submissions are blocked.

Responses the form handles: `201` joined · `409` already on the list · `429` rate limited (5 per hour per IP) · anything else shows an error with a contact email.
