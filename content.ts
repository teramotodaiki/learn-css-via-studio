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
  studioBanner.parentElement?.appendChild(exportButton);
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

  const head = styleSheets.reduce((content, { ownerNode }) => {
    if (ownerNode instanceof Element && ownerNode.tagName === 'LINK') {
      content += ownerNode.outerHTML;
    }
    return content;
  }, '');

  const studioCanvas = document.querySelector('.StudioCanvas');
  if (!studioCanvas) {
    throw new Error('.StudioCanvas not found');
  }
  const root = studioCanvas.cloneNode(true) as Element;

  function traverse(element: Element) {
    for (const attr of Array.from(element.attributes)) {
      if (
        attr.name.startsWith('data-r-') ||
        attr.name.startsWith('data-rid') ||
        attr.name.startsWith('data-v-')
      ) {
        element.removeAttribute(attr.name);
      }
    }

    if (element instanceof HTMLAnchorElement) {
      element.href = element.href; // make href absolute path
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

  const selectorToRulesMap = new Map<string, CSSStyleDeclaration>();
  const styleDeclarationMap = new Map<string, { [media: string]: string }>();

  /**
   * Find element which is queried that selector
   */
  function getOptimizedCssText(rule: CSSRule) {
    if (isCSSStyleRule(rule)) {
      const selector = extractPseudoElementFromSelectorText(rule.selectorText);
      const node = selector && root.querySelector(selector);
      const style = cloneStyle(rule.style);
      if (node) {
        // to omit same properties assigned to same selectors in different media queries
        selectorToRulesMap.set(rule.selectorText, cloneStyle(rule.style)); // cache
        const result = /^\.sd\[(data-s-.*)\]$/.exec(rule.selectorText);
        if (result) {
          reduceUnnecessaryStyle(style); // omit unnecessary styles
          const decls = styleDeclarationMap.get(result[1]) || {};
          decls[''] = style.cssText;
          styleDeclarationMap.set(result[1], decls);
        }
        return `${rule.selectorText} { ${style.cssText} }`;
      }
      return '';
    }
    if (isCSSMediaRule(rule)) {
      let css = '';
      for (const r of Array.from(rule.cssRules)) {
        if (!isCSSStyleRule(r)) throw new Error('type hint');
        const style = cloneStyle(r.style);
        const selector = extractPseudoElementFromSelectorText(r.selectorText);
        if (selector && root.querySelector(selector)) {
          // omit same properties assigned to same selector without media query
          const baseStyle = selectorToRulesMap.get(r.selectorText);
          if (baseStyle) {
            for (const key of Array.from(style)) {
              if (style[key as any] === baseStyle[key as any]) {
                style.removeProperty(key); // omit property
              }
            }
          }

          if (style.length > 0) {
            const result = /^\.sd\[(data-s-.*)\]$/.exec(r.selectorText);
            if (result) {
              const decls = styleDeclarationMap.get(result[1]) || {};
              decls[rule.conditionText] = style.cssText;
              styleDeclarationMap.set(result[1], decls);
            }
            css += `${r.selectorText} { ${style.cssText} }`;
          }
        }
      }
      return css ? `@media ${rule.media} { ${css} }` : '';
    }
    if (isCSSFontFaceRule(rule)) {
      return rule.cssText; // TODO: check font-family is used
    }
    if (isCSSKeyframesRule(rule)) {
      return ''; // TODO: support keyframe animation
    }
    throw new Error('Not implemented rule type: ' + rule.type);
  }

  let css = styleSheets.reduce((content, styleSheet) => {
    if (
      styleSheet.ownerNode instanceof Element &&
      styleSheet.ownerNode.tagName === 'STYLE'
    ) {
      for (const rule of Array.from(styleSheet.cssRules)) {
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
  const duplicatedAttrs = new Set<string>();
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

  function replaceAttr(element: Element) {
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
 */
function extractPseudoElementFromSelectorText(selectorText: string) {
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
function replaceAll(str: string, from: string, to: string) {
  return str.split(from).join(to);
}

function cloneStyle(style: CSSStyleDeclaration) {
  const el = document.createElement('div');
  el.style.cssText = style.cssText;
  return el.style;
}

/**
 * For only STYLE_RULE.
 * Not for in media query because it may override rule.
 */
function reduceUnnecessaryStyle(style: CSSStyleDeclaration) {
  if (style.width === 'auto') {
    style.removeProperty('width');
  }
  if (style.height === 'auto') {
    style.removeProperty('height');
  }
  if (style.overflowX === 'visible') {
    style.removeProperty('overflow-x');
  }
  if (style.overflowY === 'visible') {
    style.removeProperty('overflow-y');
  }
  if (style.borderRadius === '0px') {
    style.removeProperty('border-radius');
  }
  if (style.padding === '0px') {
    style.removeProperty('padding');
  }
  if (style.flex === '0 0 auto') {
    style.removeProperty('flex');
  }
  if (style.opacity === '1') {
    style.removeProperty('opacity');
  }
}

function isCSSStyleRule(rule: CSSRule): rule is CSSStyleRule {
  return rule.type === CSSRule.STYLE_RULE;
}
function isCSSFontFaceRule(rule: CSSRule): rule is CSSFontFaceRule {
  return rule.type === CSSRule.FONT_FACE_RULE;
}
function isCSSImportRule(rule: CSSRule): rule is CSSImportRule {
  return rule.type === CSSRule.IMPORT_RULE;
}
function isCSSKeyframeRule(rule: CSSRule): rule is CSSKeyframeRule {
  return rule.type === CSSRule.KEYFRAME_RULE;
}
function isCSSKeyframesRule(rule: CSSRule): rule is CSSKeyframesRule {
  return rule.type === CSSRule.KEYFRAMES_RULE;
}
function isCSSMediaRule(rule: CSSRule): rule is CSSMediaRule {
  return rule.type === CSSRule.MEDIA_RULE;
}
function isCSSNamespaceRule(rule: CSSRule): rule is CSSNamespaceRule {
  return rule.type === CSSRule.NAMESPACE_RULE;
}
function isCSSPageRule(rule: CSSRule): rule is CSSPageRule {
  return rule.type === CSSRule.PAGE_RULE;
}
function isCSSSupportsRule(rule: CSSRule): rule is CSSSupportsRule {
  return rule.type === CSSRule.SUPPORTS_RULE;
}
