# SkillSwap

SkillSwap is a skill-exchange marketplace where people can offer what they know,
discover skills they want to learn, and send direct swap requests.

The project uses a responsive HTML/CSS/vanilla-JS frontend with a Node.js,
Express and MySQL backend. There are **no preloaded sample accounts,
listings, requests or reviews**.

## Project layout

```text
skillswap/
├── *.html                 Responsive application pages
├── css/style.css          Shared responsive design system
├── js/                    Frontend controllers and API/data layer
├── backend/               Node.js/Express/MySQL API
└── tests/                 Data-layer smoke tests
```

## Run the backend

```bash
cd backend
npm install
copy .env.example .env
# Add your MySQL settings to .env
npm run seed
npm start
```

The API listens on `http://localhost:5000` by default.

`npm run seed` initializes the public skill categories only. It does not create
sample users or fake marketplace activity.

## Run the frontend

From the project root:

```bash
npx http-server . -p 8080
```

Then open `http://localhost:8080/index.html`.

The frontend automatically targets the backend at:

```text
http://<same-host>:5000/api
```

For a staging or production backend, define `window.__SKILLSWAP_ENV__` before
loading `js/env.js`.

## Data flow

`js/dataService.js` is the data facade used by the page controllers:

1. It tries the real REST API.
2. Successful API responses are cached locally for smoother navigation.
3. If the API is temporarily unavailable, locally created/cached records can
   still be used where supported.

The UI is intentionally empty on a fresh installation. Users create their own
accounts and listings instead of seeing prefilled sample content.

## Main user flow

1. Create an account.
2. Complete your profile and add skills you can offer.
3. Browse skills from other members.
4. Open a listing and send a swap request describing what you can offer.
5. Manage incoming and outgoing requests from the dashboard.
6. Complete a swap and leave a review.

## Security note

For a production deployment, keep authentication and authorization on the
backend, use HTTPS, configure a strong JWT/session strategy, validate all
incoming data server-side, and never store real passwords in browser storage.
