// script.js
import { CLIENT_ID, REDIRECT_URI, SCOPES } from './secrets.js';

// —– CONFIGURATION —–
const AUTHORIZE_URL = 'https://accounts.spotify.com/authorize';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const API_NOW_PLAY = 'https://api.spotify.com/v1/me/player/currently-playing';

// —– PKCE UTILS —–
async function generatePKCE() {
    function randBytes(len) {
        const arr = new Uint8Array(len);
        crypto.getRandomValues(arr);
        return arr;
    }
    function toBase64Url(buffer) {
        return btoa(String.fromCharCode(...new Uint8Array(buffer)))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    const verifier = toBase64Url(randBytes(32));
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    const challenge = toBase64Url(digest);
    return { verifier, challenge };
}

// —– OAUTH HANDLING —–
async function redirectToSpotifyAuth() {
    const { verifier, challenge } = await generatePKCE();
    localStorage.setItem('pkce_verifier', verifier);

    const params = new URLSearchParams({
        client_id: CLIENT_ID,
        response_type: 'code',
        redirect_uri: REDIRECT_URI,
        scope: SCOPES,
        code_challenge_method: 'S256',
        code_challenge: challenge
    });

    window.location = `${AUTHORIZE_URL}?${params}`;
}

async function handleAuthCallback() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const verifier = localStorage.getItem('pkce_verifier');
    if (!code || !verifier) return;

    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        code_verifier: verifier
    });

    const resp = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
    });
    const json = await resp.json();
    if (!resp.ok) {
        console.error('Token exchange error', json);
        return;
    }

    localStorage.setItem('access_token', json.access_token);
    localStorage.setItem('refresh_token', json.refresh_token);
    localStorage.setItem('token_expires_at', Date.now() + (json.expires_in - 60) * 1000);

    // Clean up the URL (remove ?code=…)
    window.history.replaceState({}, document.title, REDIRECT_URI);
}

// —– TOKEN REFRESH —–
async function refreshAccessToken() {
    const refresh_token = localStorage.getItem('refresh_token');
    if (!refresh_token) throw new Error('No refresh token available');

    const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token,
        client_id: CLIENT_ID
    });

    const resp = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
    });
    const json = await resp.json();
    if (!resp.ok) {
        console.error('Refresh token error', json);
        return;
    }

    localStorage.setItem('access_token', json.access_token);
    localStorage.setItem('token_expires_at', Date.now() + (json.expires_in - 60) * 1000);
}

async function ensureValidToken() {
    const expires = parseInt(localStorage.getItem('token_expires_at') || '0', 10);
    if (!localStorage.getItem('access_token') || Date.now() >= expires) {
        await refreshAccessToken();
    }
}

// —– SPOTIFY NOW PLAYING —–
async function fetchCurrentTrack() {
    await ensureValidToken();
    const token = localStorage.getItem('access_token');
    const res = await fetch(API_NOW_PLAY, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (res.status === 204) {
        // no track currently playing
        return null;
    }
    if (!res.ok) {
        console.error('Spotify API error', res.status, await res.text());
        // retry in 15s
        setTimeout(pollNowPlaying, 15000);
        return null;
    }
    return res.json();
}

function renderTrack(data) {
    if (!data?.item) return;
    document.getElementById('song-name').textContent = data.item.name;
    document.getElementById('artist-name').textContent = data.item.artists.map(a => a.name).join(', ');
    const img = data.item.album.images[1]?.url;
    document.getElementById('artwork').style.backgroundImage = img ? `url(${img})` : '';
}

async function pollNowPlaying() {
    const data = await fetchCurrentTrack();
    if (data && data.item) {
        renderTrack(data);
        const remaining = data.item.duration_ms - data.progress_ms;
        // schedule next poll just after the song ends
        setTimeout(pollNowPlaying, remaining + 500);
    }
}

// —– INIT —–
(async function init() {
    // If coming back with ?code=, finish auth first
    if (window.location.search.includes('code=')) {
        await handleAuthCallback();
        pollNowPlaying();
    } else {
        // If we already have a token, start polling; otherwise begin auth
        if (localStorage.getItem('access_token')) {
            pollNowPlaying();
        } else {
            redirectToSpotifyAuth();
        }
    }
})();
