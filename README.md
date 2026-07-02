# ComboDiet

A lightweight website for comparing symptoms and diet notes across multiple conditions.

## What it does

- Lets you enter each diagnosis or condition.
- Tracks symptoms for each one.
- Highlights overlapping symptoms shared by more than one condition.
- Summarizes repeated food themes and caution notes from the data you enter.
- Generates clinician questions to bring to an oncologist or registered dietitian.

## Important safety note

This app does **not** generate a medically verified treatment diet. It only organizes the information entered by the user. Any cancer-related diet plan should be reviewed by a licensed clinician.

## How to use it

1. For the basic local version, open [index.html](./index.html) in a browser.
2. Add conditions manually.
3. Review the overlap analysis on the right.

## Run locally

1. Create a local `.env` file based on `.env.example`.
2. Put a fresh `OPENAI_API_KEY` in that file.
3. Start the server with:

```bash
cp .env.example .env
npm start
```

4. Open `http://127.0.0.1:3000`.
5. Click `Run AI Analysis` after entering conditions.

## Deploy for your sister

The easiest path is [Render](https://render.com/).

1. Put this project in a GitHub repo.
2. Make sure `.env` is **not** committed.
3. Create a new Render Web Service from the repo.
4. Render will detect [render.yaml](./render.yaml) and use the included settings.
5. In Render, add a secret environment variable:

```text
OPENAI_API_KEY=your_real_key_here
```

6. Deploy, then send your sister the Render URL.

## Important privacy note

If your sister will enter real medical information, only share this app over a deployment you control and be thoughtful about who has access to the link and logs.

## Good next steps

- Replace manual entry with a clinician-reviewed condition database.
- Add printable visit summaries.
- Add medication tracking and supplement warnings.
- Add secure storage if private health data will be saved long-term.
