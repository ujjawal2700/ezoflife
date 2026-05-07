
import sys

def check_tags(content):
    tags = ['div', 'main', 'section', 'button', 'span', 'h1', 'h2', 'h3', 'h4', 'StepWrapper', 'motion.div', 'AnimatePresence', 'motion.button']
    counts = {t: 0 for t in tags}
    
    # Very crude counting
    for t in tags:
        counts[t] = content.count(f'<{t}') - content.count(f'</{t}')
    
    return counts

with open(r'd:\ezoflife\frontend\src\modules\user\pages\HomePage.jsx', 'r', encoding='utf-8') as f:
    content = f.read()
    print(check_tags(content))
