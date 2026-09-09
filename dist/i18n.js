'use strict';
(() => {
  const supported = ['pl', 'hu', 'sh', 'en'];
  const dictionary = window.HUBALK_TRANSLATIONS;
  let language = 'pl';
  const translate = key => language === 'pl' ? key : dictionary[key]?.[language] ?? key;
  const nodes = [];
  const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.parentElement.closest('script, style, [data-language]')) continue;
    const key = node.textContent.trim();
    if (dictionary[key]) nodes.push({node, key, original: node.textContent});
  }
  const attributes = [];
  for (const element of document.querySelectorAll('[aria-label], [placeholder], [alt], meta[name="description"]')) {
    for (const name of ['aria-label', 'placeholder', 'alt', 'content']) {
      const key = element.getAttribute(name);
      if (dictionary[key]) attributes.push({element, name, key});
    }
  }
  function setLanguage(value, updateURL = true) {
    language = supported.includes(value) ? value : 'pl';
    document.documentElement.lang = language === 'sh' ? 'sh-Latn' : language;
    for (const {node, key, original} of nodes) node.textContent = original.replace(key, translate(key));
    for (const {element, name, key} of attributes) element.setAttribute(name, translate(key));
    for (const link of document.querySelectorAll('[data-language]')) link.setAttribute('aria-pressed', String(link.dataset.language === language));
    if (updateURL) {
      const url = new URL(location.href);
      if (language === 'pl') url.searchParams.delete('lang'); else url.searchParams.set('lang', language);
      history.replaceState(null, '', url);
    }
    document.dispatchEvent(new CustomEvent('hubalk:language', {detail: language}));
  }
  window.HubalkI18n = {t: translate, get language() {return language;}, setLanguage};
  for (const link of document.querySelectorAll('[data-language]')) {
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); setLanguage(link.dataset.language);
    });
    link.addEventListener('keydown', event => {if (event.key === ' ') {event.preventDefault(); link.click();}});
  }
  window.addEventListener('popstate', () => setLanguage(new URLSearchParams(location.search).get('lang'), false));
  setLanguage(new URLSearchParams(location.search).get('lang'), false);
})();
