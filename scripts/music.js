const WORKER_BASE_URL = 'https://delicate-morning-9301.hbjgamerth001.workers.dev'; 

let lastNowPlayingKey = null;
let lastRecentTracksKey = null;
let lastRecentTracks = [];
let progressInterval = null;
let fetchTimeout = null;               
let isSongEndingRefetchActive = false;

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
    try {
        const query = `type=track&artist=${encodeURIComponent(artist)}&song=${encodeURIComponent(songName)}&mbid=${encodeURIComponent(mbid)}`;
        const res = await fetch(`${WORKER_BASE_URL}/api/artwork?${query}`);
        if (res.ok) {
            const data = await res.json();
            if (data.url) return data.url;
        }
    } catch (e) {
        console.error("Error fetching track artwork from worker:", e);
    }
    return './imgs/cover.png'; 
}

async function getArtistArtwork(artist) {
    try {
        const res = await fetch(`${WORKER_BASE_URL}/api/artwork?type=artist&artist=${encodeURIComponent(artist)}`);
        if (res.ok) {
            const data = await res.json();
            if (data.url) return data.url;
        }
    } catch (e) {
        console.error("Error fetching artist artwork from worker:", e);
    }
    return './imgs/cover.png';
}

const persistentCache = JSON.parse(localStorage.getItem('recentArtCache') || '{}');
const artCache = new Map();

async function getFinalTrackArt(track) {
    const artist = track.artist['#text'] || track.artist.name;
    const songName = track.name;
    const mbid = track.album && track.album.mbid ? track.album.mbid : (track.mbid || '');
    const cacheKey = `${artist}-${songName}`;

    if (persistentCache[cacheKey]) {
        return { artist, songName, mbid, finalArt: persistentCache[cacheKey] };
    }

    if (artCache.has(cacheKey)) {
        const finalArt = await artCache.get(cacheKey);
        return { artist, songName, mbid, finalArt };
    }

    const fetchArt = async () => {
        const largeImage = track.image && track.image[2] ? track.image[2]['#text'] : '';
        const isGenericImage = largeImage.includes('2a96cbd8b46e442fc41c2b86b821562f');
        const hasCover = largeImage.trim() !== '' && !isGenericImage;

        if (hasCover && await checkImageValid(largeImage)) {
            return largeImage;
        } else {
            return await getTrackArtwork(artist, songName, mbid);
        }
    };

    const artPromise = fetchArt().then(finalArt => {
        persistentCache[cacheKey] = finalArt;
        localStorage.setItem('recentArtCache', JSON.stringify(persistentCache));
        return finalArt;
    });

    artCache.set(cacheKey, artPromise);

    const finalArt = await artPromise;
    return { artist, songName, mbid, finalArt };
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

async function fetchLastFmTopData() {
    try {
        const tracksRes = await fetch(`${WORKER_BASE_URL}/api/top-tracks`);
        const tracksData = await tracksRes.json();
        const topTracksContainer = document.getElementById('top-tracks-list');
        
        topTracksContainer.querySelectorAll('.top-stat-item').forEach(el => el.remove());
        
        await Promise.all(tracksData.toptracks.track.map(t => getFinalTrackArt(t)));

        for (let idx = 0; idx < tracksData.toptracks.track.length; idx++) {
            const track = tracksData.toptracks.track[idx];
            const playcount = track.playcount;
            const { artist, songName, mbid, finalArt } = await getFinalTrackArt(track);

            const html = `
                <div class="top-stat-item" style="opacity: 0; transform: translateX(-10px); transition: all 0.4s ease;">
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
            const ttSpinner = document.getElementById('tt-spinner');
            if (ttSpinner) {
                ttSpinner.insertAdjacentHTML('beforebegin', html);
            } else {
                topTracksContainer.insertAdjacentHTML('beforeend', html);
            }
            
            const item = ttSpinner ? ttSpinner.previousElementSibling : topTracksContainer.lastElementChild;
            void item.offsetWidth; 
            item.style.opacity = '1';
            item.style.transform = 'translateX(0)';

            await new Promise(r => setTimeout(r, 100));
        }
        
        const finalTtSpinner = document.getElementById('tt-spinner');
        if (finalTtSpinner) finalTtSpinner.remove();

        const artistsRes = await fetch(`${WORKER_BASE_URL}/api/top-artists`);
        const artistsData = await artistsRes.json();
        const topArtistsContainer = document.getElementById('top-artists-list');
        
        topArtistsContainer.querySelectorAll('.top-stat-item').forEach(el => el.remove());
        
        for (let idx = 0; idx < artistsData.topartists.artist.length; idx++) {
            const artistObj = artistsData.topartists.artist[idx];
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

            const html = `
                <div class="top-stat-item" style="opacity: 0; transform: translateX(-10px); transition: all 0.4s ease;">
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
            const taSpinner = document.getElementById('ta-spinner');
            if (taSpinner) {
                taSpinner.insertAdjacentHTML('beforebegin', html);
            } else {
                topArtistsContainer.insertAdjacentHTML('beforeend', html);
            }
            
            const item = taSpinner ? taSpinner.previousElementSibling : topArtistsContainer.lastElementChild;
            void item.offsetWidth;
            item.style.opacity = '1';
            item.style.transform = 'translateX(0)';

            await new Promise(r => setTimeout(r, 100));
        }
        
        const finalTaSpinner = document.getElementById('ta-spinner');
        if (finalTaSpinner) finalTaSpinner.remove();

    } catch (error) {
        console.error('Error fetching top Last.fm data:', error);
    }
}

async function fetchLastFm() {
    try {
        const response = await fetch(`${WORKER_BASE_URL}/api/recent-tracks`);
        const data = await response.json();
        const tracks = data.recenttracks.track;
        
        const firstTrack = tracks[0];
        const isNowPlaying = firstTrack && firstTrack['@attr'] && firstTrack['@attr'].nowplaying === 'true';
        
        const currentNowPlayingKey = isNowPlaying 
            ? `${firstTrack.artist['#text']} - ${firstTrack.name}` 
            : 'none';

        const nowPlayingWrapper = document.getElementById('now-playing-wrapper');
        const nowPlayingContainer = document.getElementById('now-playing');

        if (currentNowPlayingKey !== lastNowPlayingKey) {
            isSongEndingRefetchActive = false;
            
            if (isNowPlaying) {
                const { artist, songName, mbid, finalArt } = await getFinalTrackArt(firstTrack);
                
                const currentTimestamps = window.lanyardMusicTimestamps;
                const currentSongClean = firstTrack.name.toLowerCase().trim();
                const currentArtistClean = (firstTrack.artist['#text'] || firstTrack.artist.name || '').toLowerCase().trim();

                const isMatchingTrack = currentTimestamps && 
                    (currentTimestamps.song === currentSongClean || currentSongClean.includes(currentTimestamps.song) || currentTimestamps.song.includes(currentSongClean)) &&
                    (currentTimestamps.artist === currentArtistClean || currentArtistClean.includes(currentTimestamps.artist) || currentTimestamps.artist.includes(currentArtistClean));

                const lanyardStart = isMatchingTrack ? currentTimestamps.start : null;
                const lanyardEnd = isMatchingTrack ? currentTimestamps.end : null;

                const html = `
                    <mdui-card variant="elevated" style="width: 100%; padding: 1.5em; display: flex; align-items: center; gap: 1.5em; border-radius: 1.5em; box-sizing: border-box;">
                        
                        <div style="position: relative; width: 6.5em; height: 6.5em; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <!-- Progress starts at 0 if the track is transitioning/waiting -->
                            <mdui-circular-progress id="np-progress" ${lanyardStart ? `value="0" max="${lanyardEnd - lanyardStart}"` : 'value="0" max="100"'} style="position: absolute; width: 100%; height: 100%; z-index: 2;"></mdui-circular-progress>
                            <img src="${finalArt}" 
                                 data-artist="${artist}" 
                                 data-song="${songName}" 
                                 data-mbid="${mbid}" 
                                 alt="Album Art" style="position: absolute; width: 6em; height: 6em; border-radius: 50%; z-index: 3; animation: spin 10s linear infinite; box-shadow: 0 4px 12px rgba(0,0,0,0.3); object-fit: cover;" />
                        </div>

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
                
                const updateNowPlayingDOM = () => {
                    nowPlayingContainer.innerHTML = html;
                    nowPlayingContainer.style.opacity = '1';

                    clearInterval(progressInterval);
                    
                    const updateProgress = () => {
                        const progressEl = document.getElementById('np-progress');
                        if (progressEl) {
                            const liveTimestamps = window.lanyardMusicTimestamps;
                            const liveSong = firstTrack.name.toLowerCase().trim();
                            const liveArtist = (firstTrack.artist['#text'] || firstTrack.artist.name || '').toLowerCase().trim();

                            const isMatching = liveTimestamps && 
                                (liveTimestamps.song === liveSong || liveSong.includes(liveTimestamps.song) || liveTimestamps.song.includes(liveSong)) &&
                                (liveTimestamps.artist === liveArtist || liveArtist.includes(liveTimestamps.artist) || liveTimestamps.artist.includes(liveArtist));

                            if (isMatching && liveTimestamps.start && liveTimestamps.end) {
                                const now = Date.now();
                                const max = liveTimestamps.end - liveTimestamps.start;
                                const current = now - liveTimestamps.start;
                                
                                progressEl.setAttribute('max', max);
                                progressEl.setAttribute('value', Math.min(Math.max(current, 0), max));

                                if (current >= max) {
                                    if (!isSongEndingRefetchActive) {
                                        isSongEndingRefetchActive = true;
                                        
                                        clearTimeout(fetchTimeout);
                                        fetchTimeout = setTimeout(() => {
                                            fetchLastFm();
                                        }, 1000);
                                    }
                                }
                            } else {
                                progressEl.setAttribute('max', '100');
                                progressEl.setAttribute('value', '0');
                            }
                        } else {
                            clearInterval(progressInterval);
                        }
                    };
                    
                    updateProgress(); 
                    progressInterval = setInterval(updateProgress, 1000);
                };

                if (lastNowPlayingKey === 'none' || !lastNowPlayingKey) {
                    updateNowPlayingDOM();
                    nowPlayingWrapper.style.gridTemplateRows = '1fr';
                    nowPlayingWrapper.style.marginBottom = '2em';
                } else {
                    nowPlayingContainer.style.opacity = '0';
                    setTimeout(updateNowPlayingDOM, 500); 
                }
            } else {
                clearInterval(progressInterval);
                nowPlayingContainer.style.opacity = '0';
                setTimeout(() => {
                    nowPlayingWrapper.style.gridTemplateRows = '0fr';
                    nowPlayingWrapper.style.marginBottom = '0';
                    setTimeout(() => nowPlayingContainer.innerHTML = '', 500); 
                }, 500); 
            }
            
            lastNowPlayingKey = currentNowPlayingKey;
        }

        const validRecentTracks = tracks.filter((t, i) => {
            if (i === 0 && t['@attr'] && t['@attr'].nowplaying === 'true') return false;
            return true;
        });

        const currentRecentTracks = validRecentTracks.map(t => ({
            id: (t.date && t.date.uts) ? t.date.uts : `${t.name.replace(/\s+/g, '')}-${t.artist['#text'].replace(/\s+/g, '')}-${Math.random()}`,
            track: t
        }));

        const recentTracksContainer = document.getElementById('recent-tracks');
        const currentIds = currentRecentTracks.map(t => t.id).join('|');
        
        if (!lastRecentTracksKey) {
            
            await Promise.all(currentRecentTracks.map(item => getFinalTrackArt(item.track)));

            for (const item of currentRecentTracks) {
                const { artist, songName, mbid, finalArt } = await getFinalTrackArt(item.track);
                
                const mockCard = document.getElementById('rt-mock');
                if (mockCard) mockCard.remove();
                
                const html = `
                <mdui-tooltip id="rt-tooltip-${item.id}" placement="top" variant="rich" headline="${songName}" content='by ${artist}' style="opacity: 0; transition: opacity 0.5s ease; display: block;">
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
                
                const rtSpinner = document.getElementById('rt-spinner');
                if (rtSpinner) {
                    rtSpinner.insertAdjacentHTML('beforebegin', html);
                } else {
                    recentTracksContainer.insertAdjacentHTML('beforeend', html);
                }
                
                const domItem = document.getElementById(`rt-tooltip-${item.id}`);
                void domItem.offsetWidth;
                domItem.style.opacity = '1';
                await new Promise(r => setTimeout(r, 50)); 
            }
            
            const finalSpinner = document.getElementById('rt-spinner');
            if (finalSpinner) finalSpinner.remove();
            
            lastRecentTracks = currentRecentTracks;
            lastRecentTracksKey = currentIds;
        } else if (currentIds !== lastRecentTracksKey) {
            const newTracks = currentRecentTracks.filter(ct => !lastRecentTracks.some(lt => lt.id === ct.id));
            const removedTracks = lastRecentTracks.filter(lt => !currentRecentTracks.some(ct => ct.id === lt.id));

            const isAtStart = recentTracksContainer.scrollLeft <= 15;

            for (const rt of removedTracks) {
                const el = document.getElementById(`rt-tooltip-${rt.id}`);
                if (el) {
                    el.style.opacity = '0';
                    el.style.transform = 'scale(0.8)';
                }
            }

            if (removedTracks.length > 0) {
                await new Promise(r => setTimeout(r, 400));
                for (const rt of removedTracks) {
                    const el = document.getElementById(`rt-tooltip-${rt.id}`);
                    if (el) {
                        el.style.flex = '0 0 0px';
                        el.style.marginRight = '-1.25em';
                        el.style.transform = 'scale(0)';
                    }
                }
                setTimeout(() => {
                    for (const rt of removedTracks) {
                        const el = document.getElementById(`rt-tooltip-${rt.id}`);
                        if (el) el.remove();
                    }
                }, 500);
                await new Promise(r => setTimeout(r, 100));
            }
            await Promise.all(newTracks.map(item => getFinalTrackArt(item.track)));

            for (let i = newTracks.length - 1; i >= 0; i--) {
                const item = newTracks[i];
                const { artist, songName, mbid, finalArt } = await getFinalTrackArt(item.track);

                const html = `
                <mdui-tooltip id="rt-tooltip-${item.id}" placement="top" variant="rich" headline="${songName}" content='by ${artist}' style="opacity: 0; flex: 0 0 0px; margin-right: -1.25em; transform: scale(0.5); transform-origin: left; transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1); display: block;">
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
                recentTracksContainer.insertAdjacentHTML('afterbegin', html);
                
                const domItem = document.getElementById(`rt-tooltip-${item.id}`);
                void domItem.offsetWidth;
                domItem.style.opacity = '1';
                domItem.style.flex = '0 0 110px';
                domItem.style.marginRight = '0';
                domItem.style.transform = 'scale(1)';

                if (isAtStart) {
                    recentTracksContainer.scrollTo({ left: 0, behavior: 'smooth' });
                }

                await new Promise(r => setTimeout(r, 150));
            }
            
            lastRecentTracks = currentRecentTracks;
            lastRecentTracksKey = currentIds;
        }
        
        const activeTrackKeys = new Set();
        if (isNowPlaying && firstTrack) {
            const npArtist = firstTrack.artist['#text'] || firstTrack.artist.name;
            activeTrackKeys.add(`${npArtist}-${firstTrack.name}`);
        }
        for (const item of currentRecentTracks) {
            const rtArtist = item.track.artist['#text'] || item.track.artist.name;
            activeTrackKeys.add(`${rtArtist}-${item.track.name}`);
        }

        for (const key of artCache.keys()) {
            if (!activeTrackKeys.has(key)) artCache.delete(key);
        }

        let cacheChanged = false;
        for (const key of Object.keys(persistentCache)) {
            if (!activeTrackKeys.has(key)) {
                delete persistentCache[key];
                cacheChanged = true;
            }
        }
        if (cacheChanged) {
            localStorage.setItem('recentArtCache', JSON.stringify(persistentCache));
        }

    } catch (error) {
        if(typeof snackAlert !== 'undefined') snackAlert('Error fetching Last.fm data: ' + error);
    }

    clearTimeout(fetchTimeout);
    const nextFetchDelay = isSongEndingRefetchActive ? 5000 : 15000;
    fetchTimeout = setTimeout(() => {
        fetchLastFm();
    }, nextFetchDelay);
}

document.addEventListener("DOMContentLoaded", () => {
    const recentTracks = document.getElementById('recent-tracks');
    if (recentTracks) {
        let scrollTarget = recentTracks.scrollLeft;
        let isAnimating = false;
        let snapTimeout = null;
        let mouseX = 0;
        let mouseY = 0;
        let currentTooltip = null;

        const updateTooltipUnderCursor = () => {
            if (mouseX === 0 && mouseY === 0) return; 
            
            const el = document.elementFromPoint(mouseX, mouseY);
            let foundTooltip = null;
            if (el && recentTracks.contains(el)) {
                foundTooltip = el.closest('mdui-tooltip');
            }
            
            if (foundTooltip !== currentTooltip) {
                if (currentTooltip) currentTooltip.open = false; 
                if (foundTooltip) foundTooltip.open = true;      
                currentTooltip = foundTooltip;
            }
        };

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            if (!isAnimating) updateTooltipUnderCursor(); 
        });

        const getScrollStep = () => {
            const child = recentTracks.firstElementChild;
            if (!child) return 130; 
            const gap = parseFloat(getComputedStyle(recentTracks).gap) || 0;
            return child.offsetWidth + gap;
        };

        recentTracks.addEventListener('wheel', (evt) => {
            if (evt.deltaY !== 0) {
                evt.preventDefault(); 
                recentTracks.style.scrollSnapType = 'none';

                const isTrackpad = Math.abs(evt.deltaY) < 40 && evt.deltaMode === 0;
                const multiplier = isTrackpad ? 1 : 2.5; 
                
                scrollTarget += evt.deltaY * multiplier;
                const maxScroll = recentTracks.scrollWidth - recentTracks.clientWidth;
                scrollTarget = Math.max(0, Math.min(scrollTarget, maxScroll));

                clearTimeout(snapTimeout);
                snapTimeout = setTimeout(() => {
                    const step = getScrollStep();
                    scrollTarget = Math.round(scrollTarget / step) * step;
                    scrollTarget = Math.max(0, Math.min(scrollTarget, maxScroll)); 
                }, 150);

                if (!isAnimating) {
                    isAnimating = true;
                    
                    const animate = () => {
                        const currentScroll = recentTracks.scrollLeft;
                        const diff = scrollTarget - currentScroll;
                        
                        updateTooltipUnderCursor(); 

                        if (Math.abs(diff) > 0.5) {
                            recentTracks.scrollLeft += diff * 0.12; 
                            requestAnimationFrame(animate);
                        } else {
                            recentTracks.scrollLeft = scrollTarget;
                            isAnimating = false;
                            recentTracks.style.scrollSnapType = 'x mandatory'; 
                            
                            const el = document.elementFromPoint(mouseX, mouseY);
                            if (!el || !recentTracks.contains(el)) {
                                if (currentTooltip) currentTooltip.open = false;
                                currentTooltip = null;
                            }
                        }
                    };
                    requestAnimationFrame(animate);
                }
            }
        }, { passive: false });

        recentTracks.addEventListener('mouseleave', () => {
            if (currentTooltip) {
                currentTooltip.open = false;
                currentTooltip = null;
            }
        });

        recentTracks.addEventListener('scroll', () => {
            if (!isAnimating) scrollTarget = recentTracks.scrollLeft; 
        });
    }
});