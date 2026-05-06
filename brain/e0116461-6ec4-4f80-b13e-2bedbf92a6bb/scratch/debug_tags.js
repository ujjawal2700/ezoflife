const fs = require('fs');
const path = 'd:/ezoflife/frontend/src/modules/user/pages/HomePage.jsx';
const content = fs.readFileSync(path, 'utf8');

// Simple tag balancer check
const tags = [];
const regex = /<(\/?[a-zA-Z0-motion\.]+)(\s+[^>]*)?>/g;
let match;

while ((match = regex.exec(content)) !== null) {
    const tag = match[1];
    if (tag.endsWith('/') || ['img', 'input', 'br', 'hr'].includes(tag)) continue;
    if (tag.startsWith('/')) {
        const opened = tags.pop();
        if (opened !== tag.substring(1)) {
            console.log(`Mismatch: Opened <${opened}> but found </${tag.substring(1)}> near line ${content.substring(0, match.index).split('\n').length}`);
        }
    } else {
        tags.push(tag);
    }
}

if (tags.length > 0) {
    console.log('Unclosed tags:', tags);
} else {
    console.log('All tags balanced successfully');
}
