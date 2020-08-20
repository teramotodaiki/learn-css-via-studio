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
        if (isCSSRuleUsed(rule)) {
          content += rule.cssText;
        }
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

  const root = document.querySelector('.StudioCanvas').cloneNode(true);
  /**
   * @param {Element} element
   */
  function traverse(element) {
    for (const attr of Array.from(element.attributes)) {
      if (
        attr.name.startsWith('data-r-') ||
        attr.name.startsWith('data-rid') ||
        attr.name.startsWith('data-v-')
      ) {
        element.removeAttribute(attr.name);
      }
    }

    for (const child of Array.from(element.children)) {
      if (
        child.className === 'publish-studio-style' ||
        child.className === 'studio__banner' ||
        child.id === __id
      ) {
        element.removeChild(child);
      } else {
        traverse(child);
      }
    }
  }
  traverse(root);

  const body = root.outerHTML;

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
    ${body}
    </div>
    </body>
    </html>`;

  return html;
}

/**
 * Remove pseudo element like "::hover"
 * @param {String} selectorText
 */
function extractPseudoElementFromSelectorText(selectorText) {
  return selectorText
    .split(',')
    .map((s) => s.split('::')[0].trim())
    .filter((s) => s)
    .join(',');
}

/**
 * Find element which is queried that selector
 * @param {CSSRule} rule
 */
function isCSSRuleUsed(rule) {
  if (rule.type === CSSRule.STYLE_RULE) {
    const selector = extractPseudoElementFromSelectorText(rule.selectorText);
    return Boolean(selector && document.querySelector(selector));
  }
  if (rule.type === CSSRule.MEDIA_RULE) {
    for (const r of rule.cssRules) {
      const selector = extractPseudoElementFromSelectorText(r.selectorText);
      if (selector && document.querySelector(selector)) {
        return true; // TODO: check indivisual css rules
      }
      return false;
    }
  }
  if (rule.type === CSSRule.FONT_FACE_RULE) {
    return true; // TODO: check font-family is used
  }
  if (rule.type === CSSRule.KEYFRAMES_RULE) {
    return false; // TODO: support keyframe animation
  }
  throw new Error('Not implemented: ' + rule.type);
}
