const __id = 'learn-css-via-studio-button';

window.addEventListener('load', start);
function start() {
  const studioBanner = document.querySelector('div.studio__banner');
  if (!studioBanner) {
    setTimeout(start, 250);
    return;
  }
  const exportButton = document.createElement('div');
  exportButton.id = __id;
  studioBanner.parentElement.appendChild(exportButton);
  const rect = studioBanner.getBoundingClientRect();
  exportButton.style.left = rect.left + 'px';
  exportButton.style.bottom = innerHeight - rect.top + 16 + 'px';
  exportButton.textContent = 'CODE';
  exportButton.addEventListener(
    'click',
    () => {
      const html = getHTML();
      const file = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(file);
      window.open(url, '_blank'); // TODO: Make it downloadable, if smaller than 65536 bytes
      URL.revokeObjectURL(url);
    },
    { passive: true }
  );
}

function getHTML() {
  const styleSheets = Array.from(document.styleSheets);
  const css = styleSheets.reduce((content, styleSheet) => {
    const { tagName } = styleSheet.ownerNode;
    if (tagName === 'STYLE') {
      for (const rule of styleSheet.cssRules) {
        content += rule.cssText;
      }
    }
    return content;
  }, '');
  const head = styleSheets.reduce((content, styleSheet) => {
    if (styleSheet.ownerNode.tagName === 'LINK') {
      content += styleSheet.ownerNode.outerHTML;
    }
    return content;
  }, '');

  const root = document.querySelector('.StudioCanvas');
  const body = Array.from(root.children).reduce((content, node) => {
    if (
      node.className !== 'publish-studio-style' &&
      node.className !== 'studio__banner' &&
      node.id !== __id
    ) {
      content += node.outerHTML;
    }
    return content;
  }, '');

  const html = `<!DOCTYPE html>
    <html>
    <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${document.title}</title>
    ${head}
    <style>
    ${css}
    </style>
    </head>
    <body>
    <div class="StudioCanvas">
    ${body}
    </div>
    </body>
    </html>`;

  return html;
}
