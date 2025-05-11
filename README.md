# Spotify “Now Playing” Widget

A minimal front-end-only widget that:
- Uses PKCE to authenticate the user with Spotify
- Polls `/me/player/currently-playing` and updates the page in real time
- Displays album artwork, song name, and artist name

---

## Project Structure

```
/project-root
  ├── index.html
  ├── styles.css
  ├── script.js
  ├── secrets.js      ← NOT committed
  ├── .gitignore
  └── README.md
```

---

## Setup

1. **Clone the repo**  
   ```bash
   git clone https://github.com/vladig98/spotify-now-playing.git
   cd spotify-now-playing
   ```

2. **Create your secrets file**  
   ```js
   // secrets.js
   export const CLIENT_ID    = 'YOUR_SPOTIFY_CLIENT_ID';
   export const CLIENT_SECRET = 'YOUR_SPOTIFY_CLIENT_SECRET';
   export const REDIRECT_URI = 'http://127.0.0.1:8888/';
   export const SCOPES       = 'user-read-currently-playing';
   ```

3. **Ensure `.gitignore` contains**  
   ```
   secrets.js
   ```

4. **Run a local HTTP server**  
   - **VS Code Live Server** (set port to 8888 in settings)

5. **Open**  
   ```
   http://127.0.0.1:8888/
   ```  
   The page will redirect you to Spotify for login/consent. After authorizing, it will come back, exchange tokens, and start showing your currently playing track.

---

## Notes

- **Security warning:** Never expose your Client Secret in front-end code. This demo uses PKCE so only your Client ID is in `secrets.js`.  
- Feel free to extend with better styles, additional track metadata, or error handling!