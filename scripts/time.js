function updateGMT7Clock() {
  const clockElement = document.getElementById('live-clock');
  if (!clockElement) return;

  const now = new Date();

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  clockElement.textContent = formatter.format(now);
}

updateGMT7Clock();

setInterval(updateGMT7Clock, 1000);