# Google BigQuery Release Insights Dashboard

A premium developer dashboard built with **Python Flask** and **plain vanilla HTML, CSS, and JavaScript** that fetches, caches, parses, and displays the Google BigQuery Release Notes.

## Features

- **Automatic Feeds Retrieval**: Fetches directly from the official [GCP BigQuery Release Notes RSS Feed](https://docs.cloud.google.com/feeds/bigquery-release-notes.xml).
- **Intelligent Local Cache**: Caches feed data for 10 minutes to prevent rate-limiting and ensure lightning-fast page loading.
- **Advanced UI Filtering & Search**: Includes active tabs to filter by type (Features, Issues, Breaking, Announcements & Changes) and a live search input filtering results by keyword, type, or date.
- **Beautiful Status Overview**: Displays counts for total logs, features, issues, breaking updates, and changes with counting animations.
- **X/Twitter Composer Integration**: Click **"Tweet this"** on any update card to open an optimized post composer modal. It auto-truncates descriptions to fit within the 280-character limit, adds relevant hashtags (`#BigQuery #GoogleCloud #GCP`), and includes a direct link back to the specific release note.
- **Premium Glassmorphic Aesthetics**: Modern typography, vibrant custom colors per category, shimmer skeleton loaders, pulse animation status indicators, and responsive layouts for desktop and mobile.

## Project Structure

- `app.py`: The Flask backend that fetches the XML feed, parses update categories (`<h3>` tags), implements cache controls, and exposes JSON APIs.
- `templates/index.html`: The HTML5 entry point structured semantically and optimized for accessibility.
- `static/css/styles.css`: Pure vanilla CSS containing styling variables, keyframe animations, glassmorphic layout styles, modal dialogues, and responsive breakpoints.
- `static/js/app.js`: Pure vanilla JavaScript handling states, asynchronous API requests, filtering/searching in memory, and X/Twitter composer integrations.
- `requirements.txt`: Python dependencies list.

## Getting Started

1. **Activate the Virtual Environment**:
   ```bash
   # On Windows:
   .venv\Scripts\activate
   ```
2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
3. **Run the Application**:
   ```bash
   python app.py
   ```
4. **Access the Dashboard**:
   Open [http://127.0.0.1:5000](http://127.0.0.1:5000) in your web browser.
