const WORKER_URL = 'https://misty-truth-61c7.hbjgamerth001.workers.dev/';

async function fetchSteamData() {
    try {
        const response = await fetch(WORKER_URL);
        const data = await response.json();

        if (data.error) throw new Error(data.error);

        document.getElementById('steam-avatar').src = data.profile.avatar;
        document.getElementById('steam-username').innerText = data.profile.name;

        const statusDot = document.getElementById('steam-status-dot');
        const statusText = document.getElementById('steam-status-text');
        const ingameContainer = document.getElementById('steam-ingame-container');

        const states = {
            0: { label: "Offline", color: "#747F8D" },
            1: { label: "Online", color: "#5c85ff" },
            2: { label: "Busy", color: "#e03e3e" },
            3: { label: "Away", color: "#f0a824" }
        };

        const currentStatus = states[data.profile.state] || { label: "Online", color: "#5c85ff" };
        statusDot.style.backgroundColor = currentStatus.color;
        statusText.innerText = currentStatus.label;

        if (data.profile.currentlyPlaying) {
            statusDot.style.backgroundColor = "#90ba3c"; // Steam in-game green
            statusText.innerText = "In-Game";
            
            document.getElementById('steam-ingame-name').innerText = data.profile.currentlyPlaying;
            if (data.profile.currentGameId) {
                document.getElementById('steam-ingame-header').src = `https://cdn.cloudflare.steamstatic.com/steam/apps/${data.profile.currentGameId}/header.jpg`;
                ingameContainer.style.display = 'flex';
            }
        } else {
            ingameContainer.style.display = 'none';
        }

        const topGamesContainer = document.getElementById('steam-top-games');
        const topHtml = data.top.map((game, index) => `
            <div class="top-stat-item" onclick="window.open('https://store.steampowered.com/app/${game.appid}', '_blank')" style="cursor: pointer;">
                <div class="top-stat-rank">${index + 1}</div>
                <img class="top-stat-art" src="https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg" style="border-radius: 8px; aspect-ratio: 460/215; width: 64px; height: auto;" onerror="this.style.display='none'">
                <div class="top-stat-text">
                    <div class="top-stat-title">${game.name}</div>
                    <div class="top-stat-desc">${game.playtime} hours played</div>
                </div>
            </div>
        `).join('');
        topGamesContainer.innerHTML = topHtml;

        const libraryContainer = document.getElementById('steam-library-grid');
        const libraryHtml = data.library.map(game => `
            <div class="steam-library-card" onclick="window.open('https://store.steampowered.com/app/${game.appid}', '_blank')">
                <img src="https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${game.appid}/library_600x900.jpg" 
                     onerror="this.onerror=null; this.src='https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg';" 
                     alt="${game.name}" 
                     loading="lazy">
                <div class="game-title">${game.name}</div>
                <div class="game-playtime">${game.playtime} hrs</div>
            </div>
        `).join('');
        libraryContainer.innerHTML = libraryHtml;

    } catch (error) {
        console.error("Failed to load Steam statistics:", error);
        const topContainer = document.getElementById('steam-top-games');
        const libContainer = document.getElementById('steam-library-grid');
        if (topContainer) topContainer.innerHTML = `<p style="opacity: 0.5;">Error loading Top Games</p>`;
        if (libContainer) libContainer.innerHTML = `<p style="opacity: 0.5; grid-column: 1/-1;">Error loading Library</p>`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchSteamData();
    setInterval(fetchSteamData, 30000); 
});