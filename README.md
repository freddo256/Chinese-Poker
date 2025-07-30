# Chinese Poker Score Tracker

A simple **web-based score tracker** for Chinese Poker (or any card game with rounds and scoring), built with plain HTML, CSS, and JavaScript.  
The site is fully client-side and uses **LocalStorage** to persist scores in the browser.

## Features

- 🖥️ **Responsive design** with a simple Bootstrap-based layout  
- 📊 **Scoreboard** automatically calculates scores per round  
- 🔒 **3-step round flow:**  
  1. Lock bids  
  2. Score round  
  3. Go to next round  
- 📝 **Edit old rounds**: unlock and fix mistakes at any time  
- 💾 **Data persistence**: scores saved in the browser’s LocalStorage  
- 📤 **Export/Import**: backup or share games as JSON files  
- 🌙 **Dark mode** toggle  

## Rules Implemented

- You **cannot lock** a round if the total number of bids equals the number of cards in play (more or less is allowed).  
- Scoring formula:
  - Correct bid: **10 + (2 × bid)** points  
  - Incorrect bid: **−2** points  
- You **cannot score** a round if *all players guessed correctly*.

## Getting Started

### 1. Clone the repo
```bash
git clone https://github.com/<your-username>/<repo-name>.git
cd <repo-name>
```

### 2. Open locally

Open `index.html` in your browser:
```bash
open index.html
```
(No build steps required, it's pure HTML/CSS/JS.)

## Development
Project is structured as:
```
index.html      # main HTML file
styles.css      # all styles
app.js          # main logic
```
No build tools needed. Just edit and refresh.

## Contributing
- Fork the project
- Create a feature branch (git checkout -b feature/foo)
- Commit changes (git commit -m 'Add foo')
- Push to branch (git push origin feature/foo)
- Open a Pull Request

## License

MIT License © Ferre Vekemans
