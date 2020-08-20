window.addEventListener('load', start);
function start() {
  const studioBanner = document.querySelector('div.studio__banner');
  if (!studioBanner) {
    setTimeout(start, 250);
    return;
  }
  const exportButton = document.createElement('div');
  exportButton.id = 'learn-css-via-studio-button';
  studioBanner.parentElement.appendChild(exportButton);
  const rect = studioBanner.getBoundingClientRect();
  exportButton.style.left = rect.left + 'px';
  exportButton.style.bottom = innerHeight - rect.top + 16 + 'px';
  exportButton.textContent = 'CODE';
  exportButton.addEventListener('click', code, { passive: true });
}

function code() {
  const html = `<!DOCTYPE html>
    <html lang="en">
    <head>
    ${document.head.innerHTML}
    </head>
    <body>
    ${document.body.innerHTML}
    </body>
    </html>`;

  const file = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(file);
  window.open(url, '_blank');
  URL.revokeObjectURL(url);
}
