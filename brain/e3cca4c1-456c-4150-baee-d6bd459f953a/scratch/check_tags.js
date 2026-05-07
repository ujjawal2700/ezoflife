
const fs = require('fs');
const content = fs.readFileSync('d:\\ezoflife\\frontend\\src\\modules\\user\\pages\\HomePage.jsx', 'utf8');

const tags = ['div', 'main', 'section', 'button', 'span', 'h1', 'h2', 'h3', 'h4', 'StepWrapper', 'motion.div', 'AnimatePresence', 'motion.button'];
const counts = {};

tags.forEach(t => {
    const opening = (content.match(new RegExp('<' + t.replace('.', '\\.'), 'g')) || []).length;
    const closing = (content.match(new RegExp('</' + t.replace('.', '\\.'), 'g')) || []).length;
    const selfClosing = (content.match(new RegExp('<' + t.replace('.', '\\.') + '[^>]*/>', 'g')) || []).length;
    counts[t] = opening - closing - selfClosing;
});

console.log(counts);
