const fs = require('fs');
const path = require('path');

const data = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '../src/data/JaEnTechJson.json'),
    'utf-8'
  )
);

console.log(`Total entries: ${data.length}\n`);

// Check for duplicates by English term
const englishMap = new Map();
const duplicateEnglish = [];

data.forEach((item, index) => {
  const key = item.english.toLowerCase();
  if (englishMap.has(key)) {
    duplicateEnglish.push({
      term: item.english,
      indices: [englishMap.get(key), index],
      entries: [data[englishMap.get(key)], item]
    });
  } else {
    englishMap.set(key, index);
  }
});

// Check for duplicates by Japanese (kanji + hiragana combination)
const japaneseMap = new Map();
const duplicateJapanese = [];

data.forEach((item, index) => {
  const key = `${item.japaneseKanji}|${item.hiragana}`;
  if (japaneseMap.has(key)) {
    duplicateJapanese.push({
      kanji: item.japaneseKanji,
      kana: item.hiragana,
      indices: [japaneseMap.get(key), index],
      entries: [data[japaneseMap.get(key)], item]
    });
  } else {
    japaneseMap.set(key, index);
  }
});

if (duplicateEnglish.length > 0) {
  console.log('=== Duplicate English Terms ===');
  duplicateEnglish.forEach(dup => {
    console.log(`\n"${dup.term}" appears ${dup.indices.length + 1} times:`);
    dup.entries.forEach((entry, i) => {
      console.log(`  [${dup.indices[i]}] ${entry.english} -> ${entry.japaneseKanji} (${entry.hiragana}) [${entry.category}]`);
    });
  });
} else {
  console.log('✓ No duplicate English terms found');
}

console.log('\n');

if (duplicateJapanese.length > 0) {
  console.log('=== Duplicate Japanese Terms ===');
  duplicateJapanese.forEach(dup => {
    console.log(`\n"${dup.kanji} (${dup.kana})" appears ${dup.indices.length + 1} times:`);
    dup.entries.forEach((entry, i) => {
      console.log(`  [${dup.indices[i]}] ${entry.english} -> ${entry.japaneseKanji} (${entry.hiragana}) [${entry.category}]`);
    });
  });
} else {
  console.log('✓ No duplicate Japanese terms found');
}

console.log(`\n=== Summary ===`);
console.log(`Total entries: ${data.length}`);
console.log(`Unique English terms: ${englishMap.size}`);
console.log(`Unique Japanese terms: ${japaneseMap.size}`);
console.log(`Duplicate English: ${duplicateEnglish.length}`);
console.log(`Duplicate Japanese: ${duplicateJapanese.length}`);
