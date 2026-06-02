import 
    { 
        snackbar, 
        getColorFromImage, 
        setColorScheme, 
        setTheme
    } from 'https://unpkg.com/mdui@2/mdui.esm.js';

// snackAlert('init')
setTheme('dark')

const cachedColor = localStorage.getItem('cachedPfpColor');
if (cachedColor) {
    setColorScheme(cachedColor);
}

function snackAlert(message, delay, close) {
    snackbar({ 
        message: message,
        placement: 'bottom-end',
        closeable: close || true,
        autoCloseDelay: delay*1000 || 3000
    });
}

try {
    document.getElementById('emailCopyBtn').addEventListener('mouseup', () => {
        copyEmail();
    })
} catch (error) {
    
}

function copyEmail() {
  const copyText = document.getElementById("emailInput");

  navigator.clipboard.writeText(copyText.value)
    .then(() => {
      snackAlert("Copied email: " + copyText.value);
    })
    .catch(err => {
      console.error("Failed to copy text: ", err);
    });

    copyText.select();
    copyText.setSelectionRange(0, 99999); 

    document.execCommand("copy");
}

const pfp = `https://lanyard.rest/570470307748380673.webp?t=${new Date().getTime()}`;

const image = new Image();
const loadingText = document.getElementById('loadingText')
image.crossOrigin = "anonymous"; 
image.src = pfp;

getColorFromImage(image).then((color) => {
    if (color !== cachedColor) {
        setColorScheme(color);
        localStorage.setItem('cachedPfpColor', color);
    }

    if (window.location.pathname.replace(/\/$/, '') === '/music') {
        document.getElementById('loadingScreen').style.display = 'none';
    } else {
        setupPageSwitching();
        fetchLanyardData();
        fetchLastFm();
        fetchLastFmTopData();
    }
}).catch(err => {
    snackAlert("Failed to get color from image:", err);
    if (window.location.pathname.replace(/\/$/, '') !== '/music') {
        setupPageSwitching();
        fetchLanyardData();
        fetchLastFm();
        fetchLastFmTopData();
    } else {
        document.getElementById('loadingScreen').style.display = 'none';
    }
});

function setupPageSwitching() {
    const navBar = document.querySelector('mdui-tabs');
    const container = document.getElementById('pages-container');
    
    if (navBar) {
        navBar.addEventListener('change', (e) => {
            const selected = e.target.value;
            const activePage = document.querySelector('.page-content.active');
            const targetPage = document.getElementById('page-' + selected);
            
            if (activePage && activePage !== targetPage) {
                
                const switchContent = () => {
                    activePage.classList.remove('fade-in');
                    
                    setTimeout(() => {
                        const oldHeight = container.getBoundingClientRect().height;
                        container.style.height = oldHeight + 'px';
                        container.style.overflow = 'hidden';

                        activePage.classList.remove('active');
                        if (targetPage) {
                            targetPage.classList.add('active');
                            container.style.height = 'auto';
                            const newHeight = container.getBoundingClientRect().height;
                            container.style.height = oldHeight + 'px';
                            void container.offsetHeight;
                            container.style.height = newHeight + 'px';
                            setTimeout(() => {
                                container.style.height = 'auto';
                                container.style.overflow = 'visible';
                                targetPage.classList.add('fade-in');
                            }, 200); 
                        }
                    }, 200);
                };

                if (window.scrollY > 0) {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    setTimeout(switchContent, 0);
                } else {
                    switchContent();
                }
            }
        });
    }
}

const API_URL = `https://api.lanyard.rest/v1/users/570470307748380673`;
const LASTFM_API = `https://53fafebc-ea37-4058-b134-e4e4ad66e6fa-00-1hbcqhxpji3em.pike.replit.dev/api/lastfm/now-playing`

async function fetchLanyardData() {
    loadingText.innerHTML = 'Fetching Discord data...'
    
    setTimeout(() => {
        fetchLanyardData()
    }, 10000);
}

function checkImageValid(url) {
    return new Promise(resolve => {
        if (!url) return resolve(false);
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
    });
}

async function getTrackArtwork(artist, songName, mbid) {
    if (mbid && mbid.trim() !== '') {
        const mbidUrl = `https://coverartarchive.org/release/${mbid}/front-250.jpg`;
        if (await checkImageValid(mbidUrl)) return mbidUrl;
    }
    
    const itunesUrl = await fetchItunesArtwork(artist, songName);
    if (itunesUrl && await checkImageValid(itunesUrl)) return itunesUrl;
    
    const ytUrl = await fetchYoutubeArtwork(artist, songName);
    if (ytUrl && await checkImageValid(ytUrl)) return ytUrl;
    
    const fallback = './imgs/cover.png';
    await checkImageValid(fallback); 
    return fallback; 
}

async function getArtistArtwork(artist) {
    const ytProfile = await fetchYoutubeArtistProfile(artist);
    if (ytProfile && await checkImageValid(ytProfile)) return ytProfile;
    
    const fallback = './imgs/cover.png';
    await checkImageValid(fallback); 
    return fallback;
}

document.addEventListener('error', async function (event) {
    const target = event.target;
    if (target.tagName === 'IMG' && target.dataset.artist && !target.dataset.fetchingFallback) {
        target.dataset.fetchingFallback = 'true';
        
        const artist = target.dataset.artist;
        const songName = target.dataset.song || '';
        const mbid = target.dataset.mbid || '';
        
        let newSrc;
        if (songName === '') {
            newSrc = await getArtistArtwork(artist);
        } else {
            newSrc = await getTrackArtwork(artist, songName, mbid);
        }
        target.src = newSrc;
    }
}, true); 

function fetchItunesArtwork(artist, songName) {
    return new Promise((resolve) => {
        const callbackName = 'itunes_' + Math.random().toString(36).substring(2, 11);
        
        window[callbackName] = function(data) {
            delete window[callbackName];
            const script = document.getElementById(callbackName);
            if (script) script.remove();
            
            if (data.results && data.results.length > 0) {
                const artworkUrl = data.results[0].artworkUrl100;
                if (artworkUrl) {
                    const highResUrl = artworkUrl.replace('100x100bb.jpg', '600x600bb.jpg');
                    resolve(highResUrl);
                    return;
                }
            }
            resolve(null);
        };

        const script = document.createElement('script');
        script.id = callbackName;
        script.src = `https://itunes.apple.com/search?term=${encodeURIComponent(artist + ' ' + songName)}&entity=song&limit=1&callback=${callbackName}`;
        
        script.onerror = () => {
            delete window[callbackName];
            script.remove();
            resolve(null);
        };
        
        document.body.appendChild(script);
    });
}

function fetchYoutubeArtwork(artist, songName) {
    return new Promise((resolve) => {
        const query = encodeURIComponent(`${artist} ${songName}`);
        const ytSearchUrl = `https://www.youtube.com/results?search_query=${query}`;
        const proxyUrl = `https://empty-star-37a7.hbjgamerth001.workers.dev/?url=${encodeURIComponent(ytSearchUrl)}`;

        fetch(proxyUrl)
            .then(response => {
                if (!response.ok) throw new Error('Proxy error');
                return response.text();
            })
            .then(html => {
                if (!html) return resolve(null);
                
                let match = html.match(/"videoId"\s*:\s*"([a-zA-Z0-9_-]{11})"/);
                if (!match) match = html.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/);

                if (match && match[1]) {
                    const videoId = match[1];
                    resolve(`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`);
                } else {
                    resolve(null);
                }
            })
            .catch((err) => {
                console.error("Fetch error:", err);
                resolve(null);
            });
    });
}

function fetchYoutubeArtistProfile(artist) {
    return new Promise((resolve) => {
        const query = encodeURIComponent(artist);
        const ytSearchUrl = `https://www.youtube.com/results?search_query=${query}&sp=EgIQAg%253D%253D`;
        const proxyUrl = `https://empty-star-37a7.hbjgamerth001.workers.dev/?url=${encodeURIComponent(ytSearchUrl)}`;

        fetch(proxyUrl)
            .then(response => {
                if (!response.ok) throw new Error('Proxy error');
                return response.text(); 
            })
            .then(html => {
                if (!html) return resolve(null);
                
                let match = html.match(/"url":"(https:\/\/yt3\.(?:ggpht\.com|googleusercontent\.com)\/[^"]+)"/);
                if (match && match[1]) {
                    let url = match[1].split('=')[0] + '=s800-c-k-c0x00ffffff-no-rj';
                    resolve(url);
                } else {
                    resolve(null);
                }
            })
            .catch((err) => {
                console.error("Fetch error:", err);
                resolve(null);
            });
    });
}


let lastNowPlayingKey = null;
let lastRecentTracksKey = null;

async function fetchLastFmTopData() {
    const apiKey = '0dd2e20f7068e382ea035e0ca0a65d5b';
    const user = 'ishikaze';
    
    try {
        const tracksRes = await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.gettoptracks&user=${user}&api_key=${apiKey}&format=json&limit=5&period=1month`);
        const tracksData = await tracksRes.json();
        
        // Execute all tracking & preloading in parallel
        const tracksPromises = tracksData.toptracks.track.map(async (track, idx) => {
            const artist = track.artist.name;
            const songName = track.name;
            const playcount = track.playcount;
            const mbid = track.mbid || '';
            
            const largeImage = track.image && track.image[2] ? track.image[2]['#text'] : '';
            const isGenericImage = largeImage.includes('2a96cbd8b46e442fc41c2b86b821562f');
            const hasCover = largeImage.trim() !== '' && !isGenericImage;
            
            let finalArt;
            if (hasCover && await checkImageValid(largeImage)) {
                finalArt = largeImage;
            } else {
                finalArt = await getTrackArtwork(artist, songName, mbid);
            }

            return `
                <div class="top-stat-item">
                    <div class="top-stat-rank">${idx + 1}</div>
                    <img src="${finalArt}" 
                         data-artist="${artist}" 
                         data-song="${songName}" 
                         data-mbid="${mbid}" 
                         class="top-stat-art" style="border-radius: 8px; object-fit: cover;" alt="Art" />
                    <div class="top-stat-text">
                        <div class="top-stat-title">${songName}</div>
                        <div class="top-stat-desc">${artist} • ${playcount} streams</div>
                    </div>
                </div>
            `;
        });
        
        const resolvedTracksHTML = await Promise.all(tracksPromises);
        // Only updates DOM after ALL images are processed and cached
        document.getElementById('top-tracks-list').innerHTML = resolvedTracksHTML.join('');


        const artistsRes = await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${user}&api_key=${apiKey}&format=json&limit=5&period=1month`);
        const artistsData = await artistsRes.json();
        
        const artistsPromises = artistsData.topartists.artist.map(async (artistObj, idx) => {
            const artist = artistObj.name;
            const playcount = artistObj.playcount;
            const mbid = artistObj.mbid || '';
            
            const largeImage = artistObj.image && artistObj.image[2] ? artistObj.image[2]['#text'] : '';
            const isGenericImage = largeImage.includes('2a96cbd8b46e442fc41c2b86b821562f');
            const hasCover = largeImage.trim() !== '' && !isGenericImage;

            let finalArt;
            if (hasCover && await checkImageValid(largeImage)) {
                finalArt = largeImage;
            } else {
                finalArt = await getArtistArtwork(artist);
            }

            return `
                <div class="top-stat-item">
                    <div class="top-stat-rank">${idx + 1}</div>
                    <img src="${finalArt}" 
                         data-artist="${artist}" 
                         data-song="" 
                         data-mbid="${mbid}" 
                         class="top-stat-art" style="border-radius: 50%; object-fit: cover;" alt="Art" />
                    <div class="top-stat-text">
                        <div class="top-stat-title">${artist}</div>
                        <div class="top-stat-desc">${playcount} streams</div>
                    </div>
                </div>
            `;
        });

        const resolvedArtistsHTML = await Promise.all(artistsPromises);
        document.getElementById('top-artists-list').innerHTML = resolvedArtistsHTML.join('');

    } catch (error) {
        console.error('Error fetching top Last.fm data:', error);
    }
}

async function fetchLastFm() {
    loadingText.innerHTML = 'Fetching Last.fm data...'
    try {
        const response = await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=ishikaze&api_key=0dd2e20f7068e382ea035e0ca0a65d5b&format=json&limit=20`);
        const data = await response.json();
        const tracks = data.recenttracks.track;
        
        const firstTrack = tracks[0];
        const isNowPlaying = firstTrack && firstTrack['@attr'] && firstTrack['@attr'].nowplaying === 'true';
        
        const currentNowPlayingKey = isNowPlaying 
            ? `${firstTrack.artist['#text']} - ${firstTrack.name}` 
            : 'none';

        if (currentNowPlayingKey !== lastNowPlayingKey) {
            const nowPlayingContainer = document.getElementById('now-playing');
            
            if (isNowPlaying) {
                const artist = firstTrack.artist['#text'];
                const songName = firstTrack.name;
                const mbid = firstTrack.album && firstTrack.album.mbid ? firstTrack.album.mbid : '';
                
                const largeImage = firstTrack.image && firstTrack.image[2] ? firstTrack.image[2]['#text'] : '';
                const isGenericImage = largeImage.includes('2a96cbd8b46e442fc41c2b86b821562f');
                const hasCover = largeImage.trim() !== '' && !isGenericImage;

                let finalArt;
                if (hasCover && await checkImageValid(largeImage)) {
                    finalArt = largeImage;
                } else {
                    finalArt = await getTrackArtwork(artist, songName, mbid);
                }

                nowPlayingContainer.innerHTML = `
                    <mdui-card variant="elevated" style="width: 100%; padding: 1.5em; display: flex; align-items: center; gap: 1.5em; border-radius: 1.5em; box-sizing: border-box;">
                        <img src="${finalArt}" 
                             data-artist="${artist}" 
                             data-song="${songName}" 
                             data-mbid="${mbid}" 
                             alt="Album Art" style="border-radius: 50%; width: 6em; height: 6em; animation: spin 10s linear infinite; box-shadow: 0 4px 12px rgba(0,0,0,0.3); object-fit: cover;" />
                        <div style="flex-grow: 1; text-align: left; min-width: 0;">
                            <div style="display: flex; align-items: center; gap: 0.5em; opacity: 0.7; margin-bottom: 0.25em;">
                                <i class="fa-brands fa-lastfm" style="font-size: 1.2em;"></i>
                                <span style="font-size: 0.85em; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Now Playing</span>
                            </div>
                            <div style="font-size: 1.25em; font-weight: bold; margin-bottom: 0.2em; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${songName}</div>
                            <div style="font-size: 0.95em; opacity: 0.8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">by ${artist}</div>
                        </div>
                    </mdui-card>
                `;
            } else {
                nowPlayingContainer.innerHTML = ''; 
            }
            
            lastNowPlayingKey = currentNowPlayingKey;
        }

        setTimeout(() => {
            document.getElementById('loadingScreen').style.display = 'none';
        }, 0);

        const currentRecentTracksKey = tracks.map(t => t.name).join('|');
        
        if (currentRecentTracksKey !== lastRecentTracksKey) {
            
            const recentTracksPromises = tracks.map(async (track, index) => {
                const trackIsNowPlaying = track['@attr'] && track['@attr'].nowplaying === 'true';
                if (index === 0 && trackIsNowPlaying) return '';
                
                const artist = track.artist['#text'];
                const songName = track.name;
                const mbid = track.album && track.album.mbid ? track.album.mbid : '';
                
                const largeImage = track.image && track.image[2] ? track.image[2]['#text'] : '';
                const isGenericImage = largeImage.includes('2a96cbd8b46e442fc41c2b86b821562f');
                const hasCover = largeImage.trim() !== '' && !isGenericImage;

                let finalArt;
                if (hasCover && await checkImageValid(largeImage)) {
                    finalArt = largeImage;
                } else {
                    finalArt = await getTrackArtwork(artist, songName, mbid);
                }

                return `
                <mdui-tooltip placement="top" variant="rich" headline="${songName}" content='by ${artist}'>
                    <div class="recent-track-card">
                        <img src="${finalArt}" 
                             data-artist="${artist}" 
                             data-song="${songName}" 
                             data-mbid="${mbid}" 
                             alt="Album Art" style="object-fit: cover;" />
                        <div class="track-title">${songName}</div>
                        <div class="track-artist">${artist}</div>
                    </div>
                </mdui-tooltip>
                `;
            });
            
            const resolvedRecentHTML = await Promise.all(recentTracksPromises);
            document.getElementById('recent-tracks').innerHTML = resolvedRecentHTML.join('');
            
            lastRecentTracksKey = currentRecentTracksKey;
        }

    } catch (error) {
        snackAlert('Error fetching Last.fm data: ' + error);
    }

    setTimeout(() => {
        fetchLastFm();
    }, 15000);
}

document.addEventListener("DOMContentLoaded", () => {
    const recentTracks = document.getElementById('recent-tracks');

    if (recentTracks) {
        recentTracks.addEventListener('wheel', (evt) => {
            if (evt.deltaY !== 0) {
                evt.preventDefault();
                recentTracks.scrollLeft += evt.deltaY;
            }
        }, { passive: false });
    }
});