// Load language values

let lang = {};

function initLang() {
    // Populate an array with strings
    lang = JSON.parse(document.getElementById('locale').innerHTML);
    // TODO: Populate an array with default language strings for fallback
}

function l(key, placeholders = {}) {
  let t = lang[key] ? lang[key]:key;
  Object.entries(placeholders).forEach(val => {
    t = t.replace('{' + val[0] + '}', val[1]);
  });
  return t;
}

