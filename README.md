# krishnang.dev

Personal portfolio for Krishnang Pandey. The site is a static, client-rendered portfolio with interactive activity feeds, writing, freelance services, education timeline, and social links. It is built with React, Tailwind CSS, and custom browser scripts, and deployed to Vercel.

## Site structure

The portfolio view is the default experience. Its sections are:

- **Hero** — introduction, calls to action, and interactive terminal.
- **Activity** — recent GitHub commits and recent writing activity.
- **Writing** — horizontally browsable blog cards.
- **Services** — freelance offerings and collaboration/contact details.
- **Education** — interactive, page-turning education timeline.
- **Connect** — GitHub, LinkedIn, and Instagram links.

The navigation links scroll to these sections. The header also lets visitors switch to a floating **Workspace Grid** view. That view presents introduction, GitHub activity, services, collaboration, and social links in movable panels. Panel positions are saved in browser local storage.

## Project layout

```text
.
├── index.html                  # HTML shell, metadata, and script/style references
├── src/
│   ├── main.jsx                # React entry point
│   ├── App.jsx                 # Portfolio page and view switching
│   ├── Workspace.jsx           # Workspace grid, panels, and header
│   └── input.css               # Tailwind input and shared component styles
├── Interactive-Elements/       # Canvas, terminal, GitHub, blog, logo, and book behavior
├── CSS/                        # Site styles, variables, and logo animation
├── blog/                       # Markdown blog posts
├── blog-index.json             # Ordered list of posts shown by the blog feed
├── dist/                       # Generated CSS and JavaScript bundles
├── tailwind.config.js          # Tailwind theme and content paths
├── vercel.json                 # Vercel build and output settings
└── .env.example                # Documents that no environment variables are required
```

## Local development

Install dependencies and build the generated assets:

```sh
npm install
npm run build
```

Open `index.html` through a local static web server. The app loads local CSS, JavaScript, images, and blog files, so opening the HTML as a `file://` URL may prevent some browser fetches from working.

Available scripts:

- `npm run build` — builds Tailwind CSS and bundles the React app into `dist/`.
- `npm run build:css` — builds `dist/output.css`.
- `npm run build:js` — builds `dist/bundle.js`.
- `npm run watch:css` — rebuilds Tailwind CSS when source styles change.

## Content and implementation

- Add blog posts as Markdown files under `blog/`, then add each post path to `blog-index.json`.
- The GitHub activity feed reads public repository and commit data from the GitHub API. Its username is currently configured in `Interactive-Elements/activity-github.js`; no API token is used.
- React page content and the Workspace Grid are in `src/App.jsx` and `src/Workspace.jsx`.
- Browser interactions are implemented in `Interactive-Elements/` and initialized from the React app.
- Styling is split between Tailwind classes, `src/input.css`, and the files in `CSS/`.

## Vercel deployment

Vercel uses the settings in `vercel.json`: run `npm run build` and serve the project root as the static output. No environment variables are currently needed; `.env.example` is informational. If the project is linked in Vercel, use the repository root as the project root and let Vercel install dependencies from `package-lock.json`.
