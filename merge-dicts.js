const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, 'src/lib/useAppConfig.ts'), 'utf8');

const startIndex = content.indexOf('const translations: Record<Lang, Record<string, string>> = {');
if (startIndex !== -1) {
  const startObj = content.indexOf('{', startIndex);
  let depth = 0;
  let endObj = -1;
  for (let i = startObj; i < content.length; i++) {
    if (content[i] === '{') depth++;
    if (content[i] === '}') {
      depth--;
      if (depth === 0) {
        endObj = i;
        break;
      }
    }
  }

  if (endObj !== -1) {
    const objStr = content.substring(startObj, endObj + 1);
    const code = `module.exports = ${objStr}`;
    fs.writeFileSync('temp_dict.js', code);
    const dicts = require('./temp_dict.js');
    
    function deepMerge(target, source) {
      for (const key in source) {
        if (target[key] !== undefined && typeof target[key] === 'object' && typeof source[key] === 'string') {
          // Conflict: target is object, source is string
          target[key + '_label'] = source[key];
        } else if (target[key] !== undefined && typeof target[key] === 'string' && typeof source[key] === 'object') {
          // Conflict: target is string, source is object
          target[key + '_label'] = target[key];
          target[key] = source[key];
        } else {
          target[key] = source[key];
        }
      }
      return target;
    }

    // Merge into es.json
    const esPath = path.join(__dirname, 'src/shared/i18n/dictionaries/es.json');
    let esJson = JSON.parse(fs.readFileSync(esPath, 'utf8'));
    esJson = deepMerge(esJson, dicts.es);
    fs.writeFileSync(esPath, JSON.stringify(esJson, null, 2));

    // Merge into en.json
    const enPath = path.join(__dirname, 'src/shared/i18n/dictionaries/en.json');
    let enJson = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    enJson = deepMerge(enJson, dicts.en);
    fs.writeFileSync(enPath, JSON.stringify(enJson, null, 2));

    console.log('Dictionaries deeply merged successfully.');
  }
} else {
  console.log('Could not find translations in useAppConfig.ts');
}
