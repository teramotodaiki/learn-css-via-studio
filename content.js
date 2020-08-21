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

  const selectorToRulesMap = new Map([['', {}]]); // type hint
  selectorToRulesMap.clear();

  const styleDeclarationMap = new Map([['', {}]]); // type hint
  styleDeclarationMap.clear();

  /**
   * Find element which is queried that selector
   * @param {CSSRule} rule
   */
  function getOptimizedCssText(rule) {
    if (rule.type === CSSRule.STYLE_RULE) {
      const selector = extractPseudoElementFromSelectorText(rule.selectorText);
      const node = selector && root.querySelector(selector);
      if (node) {
        // to omit same properties assigned to same selectors in different media queries
        selectorToRulesMap.set(rule.selectorText, rule.style); // cache
        const result = /^\.sd\[(data-s-.*)\]$/.exec(rule.selectorText);
        if (result) {
          const decls = styleDeclarationMap.get(result[1]) || {};
          decls[''] = rule.style.cssText;
          styleDeclarationMap.set(result[1], decls);
        }
        return rule.cssText;
      }
      return '';
    }
    if (rule.type === CSSRule.MEDIA_RULE) {
      for (const [index, r] of Array.from(rule.cssRules).entries()) {
        const selector = extractPseudoElementFromSelectorText(r.selectorText);
        if (selector && root.querySelector(selector)) {
          // omit same properties assigned to same selector without media query
          const style = selectorToRulesMap.get(r.selectorText);
          if (style) {
            for (const key of Array.from(r.style)) {
              if (r.style[key] === style[key]) {
                r.style.removeProperty(key); // omit property
              }
            }
          }
          if (r.style.length === 0) {
            rule.deleteRule(index); // remove empty CSSRule
          } else {
            const result = /^\.sd\[(data-s-.*)\]$/.exec(r.selectorText);
            if (result) {
              const decls = styleDeclarationMap.get(result[1]) || {};
              decls[rule.conditionText] = r.style.cssText;
              styleDeclarationMap.set(result[1], decls);
            }
          }
        }
      }
      if (rule.cssRules.length === 0) {
        return ''; // remove empty CSSMediaRule
      }
      return replaceAll(rule.cssText, '\n', ''); // make css single line to remove duplicated declaration
    }
    if (rule.type === CSSRule.FONT_FACE_RULE) {
      return rule.cssText; // TODO: check font-family is used
    }
    if (rule.type === CSSRule.KEYFRAMES_RULE) {
      return ''; // TODO: support keyframe animation
    }
    throw new Error('Not implemented rule type: ' + rule.type);
  }

  let css = styleSheets.reduce((content, styleSheet) => {
    const { tagName } = styleSheet.ownerNode;
    if (tagName === 'STYLE') {
      for (const rule of styleSheet.cssRules) {
        content += getOptimizedCssText(rule) + '\n';
      }
    }
    return content;
  }, '');

  // replace uuid attribute into short className
  const attrToShortNameMap = new Map([['', '']]); // type hint
  attrToShortNameMap.clear();
  const hashMap = new Map([['', '']]); // type hint
  hashMap.clear();
  const duplicatedAttrs = new Set();
  for (const [attr, decls] of styleDeclarationMap.entries()) {
    const serialized = JSON.stringify(decls);
    const className = hashMap.get(serialized);
    if (className === undefined) {
      const newOne = `c${hashMap.size + 1}`;
      attrToShortNameMap.set(attr, newOne);
      hashMap.set(serialized, newOne);
    } else {
      attrToShortNameMap.set(attr, className);
      duplicatedAttrs.add(attr);
    }
  }
  css = css
    .split('\n')
    .filter((content) => {
      for (const attr of duplicatedAttrs.keys()) {
        if (content.includes(attr)) {
          return false; // remove duplicated declaration
        }
      }
      return true;
    })
    .join('\n');
  for (const [attr, cn] of attrToShortNameMap.entries()) {
    css = replaceAll(css, `.sd[${attr}]`, `.sd.${cn}`);
  }
  /**
   *
   * @param {Element} element
   */
  function replaceAttr(element) {
    for (const attr of Array.from(element.getAttributeNames())) {
      const cn = attrToShortNameMap.get(attr);
      if (cn) {
        element.removeAttribute(attr);
        element.classList.add(cn);
      }
    }
    for (const child of Array.from(element.children)) {
      replaceAttr(child);
    }
  }
  replaceAttr(root);

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
 * String.prototype.replaceAll
 * @param {String} str
 * @param {String} from
 * @param {String} to
 */
function replaceAll(str, from, to) {
  return str.split(from).join(to);
}

/**
 *
 * @param {CSSStyleDeclaration} style
 */
function serializeStyle(style) {}
