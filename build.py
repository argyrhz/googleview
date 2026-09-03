#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
GoogleViews static site builder.

Each page's <main> lives in _content/<slug>.html. This script wraps it in the
shared <head>, navigation and footer, then writes a fully standalone .html file
to the project root. The output needs no server and no JavaScript to render —
run `python build.py` after editing anything in _content/ or in this file.
"""
import io
import os

SITE = "https://googleviews.gr"
EMAIL = "info@googleviews.gr"
PHONE_HREF = "+306900000000"
PHONE_TEXT = "+30 690 000 0000"

# slug -> (nav label, <title>, meta description, nav key)
PAGES = {
    "index": (
        "Αρχική",
        "GoogleViews — Περισσότερες κριτικές Google με ένα άγγιγμα",
        "Έξυπνες κάρτες NFC που φέρνουν στην επιχείρησή σου περισσότερες κριτικές "
        "στο Google. Ο πελάτης ακουμπάει το κινητό του και η σελίδα αξιολόγησης "
        "ανοίγει αμέσως. Χωρίς εφαρμογή, χωρίς συνδρομή.",
    ),
    "nfc": (
        "Τι είναι το NFC",
        "Τι είναι το NFC; Ο απλός οδηγός — GoogleViews",
        "Τι είναι η τεχνολογία NFC, πώς δουλεύει και γιατί την ξέρεις ήδη. "
        "Εξηγούμε τα πάντα σε απλά ελληνικά, χωρίς τεχνικούς όρους.",
    ),
    "pos-leitourgei": (
        "Πώς λειτουργεί",
        "Πώς λειτουργεί — GoogleViews",
        "Από την παραγγελία μέχρι την πρώτη κριτική: πώς στήνουμε την κάρτα NFC "
        "για την επιχείρησή σου και τι κάνει ο πελάτης σε 5 δευτερόλεπτα.",
    ),
    "proionta": (
        "Προϊόντα",
        "Προϊόντα — Κάρτες, σταντ και αυτοκόλλητα NFC — GoogleViews",
        "Κάρτες NFC, επιτραπέζια σταντ, αυτοκόλλητα και μπρελόκ για κριτικές "
        "Google. Ανθεκτικά υλικά, τυπωμένα με το λογότυπό σου.",
    ),
    "times": (
        "Τιμές",
        "Τιμές & πακέτα — GoogleViews",
        "Διαφανείς τιμές, καμία συνδρομή. Πακέτα με κάρτες NFC και σταντ για "
        "εστιατόρια, καφετέριες και ξενοδοχεία σε όλη την Ελλάδα.",
    ),
}

# Order shown in the header (index is reached through the logo)
# (label, href). Contact lives on the homepage now, so it is not a page.
NAV = [
    ("Τι είναι το NFC", "nfc.html"),
    ("Πώς λειτουργεί", "pos-leitourgei.html"),
    ("Προϊόντα", "proionta.html"),
    ("Τιμές", "times.html"),
    ("Επικοινωνία", "index.html#epikoinonia"),
]

LOGO = """      <picture>
        <source srcset="assets/img/logo.webp" type="image/webp">
        <img class="brand__mark" src="assets/img/logo.png" alt="" width="480" height="341">
      </picture>"""


# The product itself. Injected wherever a page writes <!--REVIEW-CARD-->, so
# the artwork only exists once even though it appears on five pages.
REVIEW_CARD = """<div class="rcard">
        <div class="rcard__face">
        <svg class="rcard__nfc" viewBox="0 0 100 80" aria-hidden="true">
          <circle cx="50" cy="68" r="7.6" fill="currentColor"/>
          <g fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round">
            <path d="M37.4 50A22 22 0 0 1 62.6 50"/>
            <path d="M28.2 36.9A38 38 0 0 1 71.8 36.9"/>
            <path d="M19 23.8A54 54 0 0 1 81 23.8"/>
          </g>
        </svg>

        <span class="rcard__g" aria-hidden="true">
          <svg viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.28-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
        </span>

        <span class="rcard__stars" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="m12 17.6-6.1 3.5 1.6-6.9-5.3-4.6 7-.6L12 2.4l2.8 6.6 7 .6-5.3 4.6 1.6 6.9z"/></svg>
          <svg viewBox="0 0 24 24"><path d="m12 17.6-6.1 3.5 1.6-6.9-5.3-4.6 7-.6L12 2.4l2.8 6.6 7 .6-5.3 4.6 1.6 6.9z"/></svg>
          <svg viewBox="0 0 24 24"><path d="m12 17.6-6.1 3.5 1.6-6.9-5.3-4.6 7-.6L12 2.4l2.8 6.6 7 .6-5.3 4.6 1.6 6.9z"/></svg>
          <svg viewBox="0 0 24 24"><path d="m12 17.6-6.1 3.5 1.6-6.9-5.3-4.6 7-.6L12 2.4l2.8 6.6 7 .6-5.3 4.6 1.6 6.9z"/></svg>
          <svg viewBox="0 0 24 24"><path d="m12 17.6-6.1 3.5 1.6-6.9-5.3-4.6 7-.6L12 2.4l2.8 6.6 7 .6-5.3 4.6 1.6 6.9z"/></svg>
        </span>

        <p class="rcard__cta">Review us<br>on <span class="rcard__gw" aria-hidden="true"><i>G</i><i>o</i><i>o</i><i>g</i><i>l</i><i>e</i></span></p>
        </div>
      </div>"""


REVIEW_STAND = ('<div class="rcard-stand">' +
                REVIEW_CARD +
                '<span class="rcard-stand__base"></span></div>')

REVIEW_STICKER = REVIEW_CARD.replace('class="rcard"', 'class="rcard rcard--sticker"')

# The same card printed on white. Same artwork, inverted ground.
REVIEW_CARD_LIGHT = REVIEW_CARD.replace('class="rcard"', 'class="rcard rcard--light"')

# The homepage shows the pair the way the shop photographs them: the white one
# behind and turned out, the black one overlapping it in front.
REVIEW_DUO = ('<div class="rcard-duo">'
              '<div class="rcard-duo__back">' + REVIEW_CARD_LIGHT + '</div>'
              '<div class="rcard-duo__front">' + REVIEW_CARD + '</div>'
              '</div>')


def head(slug, title, desc):
    canonical = SITE + "/" + ("" if slug == "index" else slug + ".html")
    return f"""<!DOCTYPE html>
<html lang="el">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#ffffff">
<link rel="canonical" href="{canonical}">

<meta property="og:type" content="website">
<meta property="og:locale" content="el_GR">
<meta property="og:site_name" content="GoogleViews">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{canonical}">
<meta property="og:image" content="{SITE}/assets/img/og-image.png">
<meta name="twitter:card" content="summary_large_image">

<link rel="icon" href="assets/img/favicon.ico" sizes="any">
<link rel="icon" href="assets/img/favicon-64.png" type="image/png">
<link rel="apple-touch-icon" href="assets/img/apple-touch-icon.png">
<link rel="manifest" href="site.webmanifest">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="image" href="assets/img/logo.webp" type="image/webp">
<link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300..700&display=swap" rel="stylesheet">

<link rel="stylesheet" href="assets/css/style.css">
<link rel="stylesheet" href="assets/css/components.css">
<link rel="stylesheet" href="assets/css/mockups.css">
<link rel="stylesheet" href="assets/css/pages.css">
<noscript><style>.reveal{{opacity:1 !important;transform:none !important}}</style></noscript>

</head>
"""


def jsonld(slug):
    org = f"""<script type="application/ld+json">
{{
  "@context":"https://schema.org",
  "@type":"Organization",
  "name":"GoogleViews",
  "url":"{SITE}/",
  "logo":"{SITE}/assets/img/icon-512.png",
  "description":"Έξυπνες κάρτες NFC για περισσότερες κριτικές Google σε επιχειρήσεις στην Ελλάδα.",
  "areaServed":{{"@type":"Country","name":"Ελλάδα"}},
  "contactPoint":{{
    "@type":"ContactPoint",
    "contactType":"sales",
    "email":"{EMAIL}",
    "availableLanguage":["el","en"]
  }}
}}
</script>
"""
    return org if slug == "index" else ""


def nav(slug):
    links = []
    drawer = ['  <a class="nav__link%s" href="index.html">Αρχική</a>'
              % (" is-active" if slug == "index" else "")]
    for label, href in NAV:
        active = " is-active" if href == slug + ".html" else ""
        links.append(f'      <a class="nav__link{active}" href="{href}">{label}</a>')
        drawer.append(f'  <a class="nav__link{active}" href="{href}">{label}</a>')
    return f"""<body>
<a class="skip-link" href="#main">Μετάβαση στο περιεχόμενο</a>

<header class="nav" id="nav">
  <div class="nav__inner">
    <a class="brand" href="index.html" aria-label="GoogleViews — αρχική">
{LOGO}
      <span class="brand__name">GoogleViews</span>
    </a>

    <nav class="nav__links" aria-label="Κύρια πλοήγηση">
{chr(10).join(links)}
    </nav>

    <div class="nav__actions">
      <a class="btn btn--primary btn--sm btn--nav" href="index.html#epikoinonia">Παράγγειλε τώρα</a>
      <button class="nav__burger" type="button" aria-label="Μενού" aria-expanded="false" aria-controls="drawer">
        <span class="burger-box"><span></span><span></span><span></span></span>
      </button>
    </div>
  </div>
</header>

<div class="nav__drawer" id="drawer" aria-hidden="true">
{chr(10).join(drawer)}
  <a class="btn btn--primary btn--block" href="index.html#epikoinonia">Παράγγειλε τώρα</a>
</div>

<main id="main">
"""


FOOTER = f"""</main>

<footer class="footer">
  <div class="container">
    <div class="footer__grid">
      <div>
        <a class="brand" href="index.html" aria-label="GoogleViews — αρχική">
{LOGO}
          <span class="brand__name">GoogleViews</span>
        </a>
        <p class="body-lg" style="margin-top:var(--s-5);max-width:42ch">
          Έξυπνες κάρτες NFC που βοηθούν τις ελληνικές επιχειρήσεις να μαζεύουν
          περισσότερες κριτικές στο Google — με ένα άγγιγμα.
        </p>
        <div class="row" style="margin-top:var(--s-6);gap:10px">
          <a class="btn btn--tonal btn--sm" href="index.html#epikoinonia">Παράγγειλε τώρα</a>
        </div>
      </div>

      <div>
        <h2 class="footer__h">Προϊόν</h2>
        <div class="footer__links">
          <a href="nfc.html">Τι είναι το NFC</a>
          <a href="pos-leitourgei.html">Πώς λειτουργεί</a>
          <a href="proionta.html">Προϊόντα</a>
          <a href="times.html">Τιμές</a>
        </div>
      </div>

      <div>
        <h2 class="footer__h">Εταιρεία</h2>
        <div class="footer__links">
          <a href="index.html#epikoinonia">Επικοινωνία</a>
          <a href="index.html#faq">Συχνές ερωτήσεις</a>
        </div>
      </div>

      <div>
        <h2 class="footer__h">Επικοινωνία</h2>
        <div class="footer__links">
          <a href="mailto:{EMAIL}">{EMAIL}</a>
          <a href="tel:{PHONE_HREF}">{PHONE_TEXT}</a>
          <span class="dim small">Αποστολή σε όλη την Ελλάδα</span>
        </div>
      </div>
    </div>

    <div class="footer__bottom">
      <p>© <span data-year>2026</span> GoogleViews. Με επιφύλαξη παντός δικαιώματος.</p>
      <p class="footer__legal">
        Το GoogleViews είναι ανεξάρτητη επιχείρηση και δεν σχετίζεται, δεν
        συνεργάζεται και δεν υποστηρίζεται από την Google LLC. Τα «Google»,
        «Google Maps» και τα σχετικά σήματα ανήκουν στην Google LLC.
      </p>
    </div>
  </div>
</footer>

<script src="assets/js/main.js" defer></script>
</body>
</html>
"""


def build():
    root = os.path.dirname(os.path.abspath(__file__))
    built = []
    for slug, (_, title, desc) in PAGES.items():
        src = os.path.join(root, "_content", slug + ".html")
        if not os.path.exists(src):
            print("  skip (no content yet):", slug)
            continue
        body = io.open(src, encoding="utf-8").read().strip()
        body = (body.replace("<!--REVIEW-STAND-->", REVIEW_STAND)
                    .replace("<!--REVIEW-STICKER-->", REVIEW_STICKER)
                    .replace("<!--REVIEW-DUO-->", REVIEW_DUO)
                    .replace("<!--REVIEW-CARD-->", REVIEW_CARD))
        out = head(slug, title, desc) + jsonld(slug) + nav(slug) + body + "\n\n" + FOOTER
        dest = os.path.join(root, slug + ".html")
        io.open(dest, "w", encoding="utf-8").write(out)
        built.append(slug + ".html")
    print("built:", ", ".join(built) if built else "nothing")


if __name__ == "__main__":
    build()
