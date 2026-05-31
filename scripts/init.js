import 
    { 
        snackbar, 
        getColorFromImage, 
        setColorScheme, 
        setTheme
    } from 'https://unpkg.com/mdui@2/mdui.esm.js';

// snackAlert('init')
setTheme('dark')

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

const pfp = 'https://lanyard.rest/570470307748380673.webp'
// document.getElementById('discordPfp').setAttribute('src', pfp)

const image = new Image();
const loadingText = document.getElementById('loadingText')
image.crossOrigin = "anonymous"; 
image.src = pfp;

getColorFromImage(image).then((color) => {
    setColorScheme(color);
    if (window.location.pathname.replace(/\/$/, '') === '/music') {
        document.getElementById('loadingScreen').style.display = 'none';
    } else {
        setupPageSwitching();
        fetchLanyardData()
        fetchLastFm();
        fetchLastFmTopData();
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
                
                // Function to execute the fade and height transition
                const switchContent = () => {
                    // 1. Fade out current content (0.25s)
                    activePage.classList.remove('fade-in');
                    
                    setTimeout(() => {
                        // 2. Lock current height
                        const oldHeight = container.getBoundingClientRect().height;
                        container.style.height = oldHeight + 'px';
                        container.style.overflow = 'hidden';
                        
                        // Swap classes
                        activePage.classList.remove('active');
                        if (targetPage) {
                            targetPage.classList.add('active');
                            
                            // Measure new height
                            container.style.height = 'auto';
                            const newHeight = container.getBoundingClientRect().height;
                            
                            // Revert to old height briefly to setup transition
                            container.style.height = oldHeight + 'px';
                            
                            // Force DOM reflow so the browser catches the old height
                            void container.offsetHeight;
                            
                            // Transition to new height
                            container.style.height = newHeight + 'px';
                            
                            // 3. Wait for height transition (0.3s) before fading in
                            setTimeout(() => {
                                container.style.height = 'auto';
                                container.style.overflow = 'visible';
                                targetPage.classList.add('fade-in');
                            }, 200); 
                        }
                    }, 200);
                };

                // Check if we need to scroll to top first
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
    // snackAlert('sending request to lanyard')
    
    setTimeout(() => {
        fetchLanyardData()
    }, 10000);
}


document.addEventListener('error', function (event) {
    const target = event.target;
    if (target.tagName === 'IMG' && target.dataset.artist) {
        handleArtworkError(target);
    }
}, true); 

function handleArtworkError(imgElement) {
    let attempt = parseInt(imgElement.dataset.fallbackLevel || '0');
    
    const artist = imgElement.dataset.artist;
    const songName = imgElement.dataset.song;
    const mbid = imgElement.dataset.mbid;

    if (attempt >= 5) {
        imgElement.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
        return;
    }

    attempt++;
    imgElement.dataset.fallbackLevel = attempt;

    if (attempt === 1) {
        if (mbid && mbid.trim() !== '') {
            imgElement.src = `https://coverartarchive.org/release/${mbid}/front-250.jpg`;
        } else {
            handleArtworkError(imgElement);
        }
        return;
    }

    if (attempt === 2) {
        fetchItunesArtwork(artist, songName).then(url => {
            if (url) {
                imgElement.src = url;
            } else {
                handleArtworkError(imgElement);
            }
        });
        return;
    }

    if (attempt === 3) {
        fetchYoutubeArtwork(artist, songName).then(url => {
            if (url) {
                imgElement.src = url;
            } else {
                handleArtworkError(imgElement);
            }
        });
        return;
    }
    if (attempt === 4) {
        imgElement.src = './imgs/cover.png';
        return;
    }
}

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
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(ytSearchUrl)}`;

        fetch(proxyUrl)
            .then(response => {
                if (!response.ok) throw new Error('Proxy error');
                return response.json();
            })
            .then(data => {
                const html = data.contents;
                if (!html) {
                    resolve(null);
                    return;
                }
                
                let match = html.match(/"videoId"\s*:\s*"([a-zA-Z0-9_-]{11})"/);
                
                if (!match) {
                    match = html.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/);
                }

                if (match && match[1]) {
                    const videoId = match[1];
                    // mqdefault is medium quality (320x180)
                    resolve(`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`);
                } else {
                    resolve(null);
                }
            })
            .catch(() => {
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
        // Fetch Top Tracks
        const tracksRes = await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.gettoptracks&user=${user}&api_key=${apiKey}&format=json&limit=5&period=1month`);
        const tracksData = await tracksRes.json();
        
        let tracksHTML = '';
        tracksData.toptracks.track.forEach((track, idx) => {
            const artist = track.artist.name;
            const songName = track.name;
            const playcount = track.playcount;
            const mbid = track.mbid || '';
            
            const largeImage = track.image && track.image[2] ? track.image[2]['#text'] : '';
            const genericStarHash = '2a96cbd8b46e442fc41c2b86b821562f';
            const isGenericImage = largeImage.includes(genericStarHash);
            
            const hasCover = largeImage.trim() !== '' && !isGenericImage;
            const albumArt = hasCover ? largeImage : './imgs/cover.png';
            const fallbackAttr = !hasCover ? 'data-needs-fallback="true"' : '';

            tracksHTML += `
                <div class="top-stat-item">
                    <div class="top-stat-rank">${idx + 1}</div>
                    <img src="${albumArt}" 
                         data-artist="${artist}" 
                         data-song="${songName}" 
                         data-mbid="${mbid}" 
                         ${fallbackAttr}
                         class="top-stat-art" style="border-radius: 8px;" alt="Art" />
                    <div class="top-stat-text">
                        <div class="top-stat-title">${songName}</div>
                        <div class="top-stat-desc">${artist} • ${playcount} streams</div>
                    </div>
                </div>
            `;
        });
        document.getElementById('top-tracks-list').innerHTML = tracksHTML;
        
        // Trigger artwork fallbacks for top tracks
        document.querySelectorAll('#top-tracks-list img[data-needs-fallback="true"]').forEach(img => {
            img.removeAttribute('data-needs-fallback'); 
            handleArtworkError(img);
        });

        // Fetch Top Artists
        const artistsRes = await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${user}&api_key=${apiKey}&format=json&limit=5&period=1month`);
        const artistsData = await artistsRes.json();
        
        let artistsHTML = '';
        artistsData.topartists.artist.forEach((artistObj, idx) => {
            const artist = artistObj.name;
            const playcount = artistObj.playcount;
            const mbid = artistObj.mbid || '';
            
            const largeImage = artistObj.image && artistObj.image[2] ? artistObj.image[2]['#text'] : '';
            const genericStarHash = '2a96cbd8b46e442fc41c2b86b821562f';
            const isGenericImage = largeImage.includes(genericStarHash);
            
            const hasCover = largeImage.trim() !== '' && !isGenericImage;
            const albumArt = hasCover ? largeImage : './imgs/cover.png';
            const fallbackAttr = !hasCover ? 'data-needs-fallback="true"' : '';

            artistsHTML += `
                <div class="top-stat-item">
                    <div class="top-stat-rank">${idx + 1}</div>
                    <img src="${albumArt}" 
                         data-artist="${artist}" 
                         data-song="" 
                         data-mbid="${mbid}" 
                         ${fallbackAttr}
                         class="top-stat-art" style="border-radius: 50%;" alt="Art" />
                    <div class="top-stat-text">
                        <div class="top-stat-title">${artist}</div>
                        <div class="top-stat-desc">${playcount} streams</div>
                    </div>
                </div>
            `;
        });
        document.getElementById('top-artists-list').innerHTML = artistsHTML;

        // Trigger artwork fallbacks for top artists
        document.querySelectorAll('#top-artists-list img[data-needs-fallback="true"]').forEach(img => {
            img.removeAttribute('data-needs-fallback'); 
            handleArtworkError(img);
        });

    } catch (error) {
        console.error('Error fetching top Last.fm data:', error);
    }
}

async function fetchLastFm() {
    loadingText.innerHTML = 'Fetching Last.fm data...'
    try {
        const response = await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=ishikaze&api_key=0dd2e20f7068e382ea035e0ca0a65d5b&format=json&limit=6`);
        const data = await response.json();
        const tracks = data.recenttracks.track;
        
        const firstTrack = tracks[0];
        const isNowPlaying = firstTrack && firstTrack['@attr'] && firstTrack['@attr'].nowplaying === 'true';
        
        const currentNowPlayingKey = isNowPlaying 
            ? `${firstTrack.artist['#text']} - ${firstTrack.name}` 
            : 'none';

        if (currentNowPlayingKey !== lastNowPlayingKey) {
            lastNowPlayingKey = currentNowPlayingKey;

            const nowPlayingContainer = document.getElementById('now-playing');
            if (isNowPlaying) {
                const artist = firstTrack.artist['#text'];
                const songName = firstTrack.name;
                const mbid = firstTrack.album && firstTrack.album.mbid ? firstTrack.album.mbid : '';
                
                const largeImage = firstTrack.image && firstTrack.image[2] ? firstTrack.image[2]['#text'] : '';
                const genericStarHash = '2a96cbd8b46e442fc41c2b86b821562f';
                const isGenericImage = largeImage.includes(genericStarHash);
                
                const hasCover = largeImage.trim() !== '' && !isGenericImage;
                const placeholderUrl = './imgs/cover.png'; 
                const albumArt = hasCover ? largeImage : placeholderUrl;
                const fallbackAttr = !hasCover ? 'data-needs-fallback="true"' : '';

                nowPlayingContainer.innerHTML = `
                    <mdui-card variant="elevated" style="width: 100%; padding: 1.5em; display: flex; align-items: center; gap: 1.5em; border-radius: 1.5em; box-sizing: border-box;">
                        <img src="${albumArt}" 
                             data-artist="${artist}" 
                             data-song="${songName}" 
                             data-mbid="${mbid}" 
                             ${fallbackAttr}
                             alt="Album Art" style="border-radius: 50%; width: 6em; height: 6em; animation: spin 10s linear infinite; box-shadow: 0 4px 12px rgba(0,0,0,0.3);" />
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
                
                const newImg = nowPlayingContainer.querySelector('img[data-needs-fallback="true"]');
                if (newImg) {
                    newImg.removeAttribute('data-needs-fallback');
                    handleArtworkError(newImg);
                }
            } else {
                nowPlayingContainer.innerHTML = ''; 
            }
        }

        // Combine track names into a single string to compare against our tracker variable
        const currentRecentTracksKey = tracks.map(t => t.name).join('|');
        
        // Only regenerate UI and fetch cover art if the tracks have actually changed
        if (currentRecentTracksKey !== lastRecentTracksKey) {
            lastRecentTracksKey = currentRecentTracksKey;

            let outputHTML = '';
            tracks.forEach((track, index) => {
                const trackIsNowPlaying = track['@attr'] && track['@attr'].nowplaying === 'true';
                
                if (index === 0 && trackIsNowPlaying) {
                    return;
                }
                
                const artist = track.artist['#text'];
                const songName = track.name;
                const mbid = track.album && track.album.mbid ? track.album.mbid : '';
                
                const largeImage = track.image && track.image[2] ? track.image[2]['#text'] : '';
                const genericStarHash = '2a96cbd8b46e442fc41c2b86b821562f';
                const isGenericImage = largeImage.includes(genericStarHash);
                
                const hasCover = largeImage.trim() !== '' && !isGenericImage;
                const placeholderUrl = './imgs/cover.png'; 
                const albumArt = hasCover ? largeImage : placeholderUrl;
                const fallbackAttr = !hasCover ? 'data-needs-fallback="true"' : '';

                outputHTML += `
                <mdui-tooltip placement="top" variant="rich" headline="${songName}" content='by ${artist}'>
                    <div class="recent-track-card">
                        <img src="${albumArt}" 
                             data-artist="${artist}" 
                             data-song="${songName}" 
                             data-mbid="${mbid}" 
                             ${fallbackAttr}
                             alt="Album Art" />
                        <div class="track-title">${songName}</div>
                        <div class="track-artist">${artist}</div>
                    </div>
                </mdui-tooltip>
                `;
            });
            
            document.getElementById('recent-tracks').innerHTML = outputHTML;

            // Trigger artwork error handler only for newly generated HTML
            document.querySelectorAll('#recent-tracks img[data-needs-fallback="true"]').forEach(img => {
                img.removeAttribute('data-needs-fallback'); 
                handleArtworkError(img);
            });
        }

        setTimeout(() => {
            document.getElementById('loadingScreen').style.display = 'none';
        }, 0);

    } catch (error) {
        snackAlert('Error fetching Last.fm data: ' + error);
    }

    setTimeout(() => {
        fetchLastFm();
    }, 15000);
}