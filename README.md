# Vaginal Microbiome site

Static site (HTML + CSS, plus one small vanilla-JS file for the upload preview). No framework, no build step.

```
my-site/
├── index.html          # Data, Results, Upload sections
├── style.css
├── upload.js           # in-browser CSV/TSV preview; nothing is sent to a server
├── .nojekyll           # tells GitHub Pages to serve files as-is
├── assets/data/ravel2011_ph_by_group.csv
├── assets/img/ph_by_group.{svg,png}
└── scripts/make_ph_figure.py   # regenerates the figure (run from project root)
```

## Preview locally
    cd my-site && python -m http.server 8000   # open http://localhost:8000

## Deploy to GitHub Pages
1. Push the contents of `my-site/` to a GitHub repository (root of the repo, or a `/docs` folder).
2. Settings → Pages → Source: "Deploy from a branch", choose the branch and `/ (root)` or `/docs`.
3. The site appears at `https://<user>.github.io/<repo>/`. All paths are relative, so it works under a subpath.
