const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      filelist = walkSync(dirFile, filelist);
    } else if (dirFile.endsWith('.vue')) {
      filelist.push(dirFile);
    }
  });
  return filelist;
};

const files = walkSync('./src');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Clean up previous broken dark mode classes
  content = content.replace(/ dark:bg-\[#1b1b1c\]/g, '');
  content = content.replace(/ dark:bg-\[#202020\]/g, '');
  content = content.replace(/ dark:bg-\[#131313\]/g, '');
  content = content.replace(/ dark:border-white\/10/g, '');
  content = content.replace(/ dark:text-\[#e5e2e1\]/g, '');
  content = content.replace(/ dark:text-\[#bfcaba\]/g, '');

  // Apply new Professional Dark Mode
  // Backgrounds
  content = content.replace(/bg-white(?!\/)/g, 'bg-white dark:bg-[#1e1e1e]');
  content = content.replace(/bg-\[#f8faf7\]/g, 'bg-[#f8faf7] dark:bg-[#121212]');
  content = content.replace(/bg-\[#f3f5f2\]/g, 'bg-[#f3f5f2] dark:bg-[#2a2a2a]');
  
  // Text
  content = content.replace(/text-\[#1c1b1b\]/g, 'text-[#1c1b1b] dark:text-[#f3f4f6]');
  content = content.replace(/text-\[#40493d\]/g, 'text-[#40493d] dark:text-[#9ca3af]');
  
  // Borders
  content = content.replace(/border-\[#e0e4df\]/g, 'border-[#e0e4df] dark:border-[#374151]');

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Fixed', file);
  }
});
