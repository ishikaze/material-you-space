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