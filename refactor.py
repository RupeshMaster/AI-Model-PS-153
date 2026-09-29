import glob
import re

for f in glob.glob('site_code/frontend/src/**/*.jsx', recursive=True):
    with open(f, 'r', encoding='utf-8') as file:
        text = file.read()
    
    if 'localhost:8000' in text:
        inject = '\nconst API_URL = import.meta.env.VITE_API_URL || \'http://localhost:8000\';\nconst WS_URL = import.meta.env.VITE_WS_URL || \'ws://localhost:8000\';\n'
        
        lines = text.split('\n')
        last_import = 0
        for i, l in enumerate(lines):
            if l.startswith('import '): 
                last_import = i
                
        lines.insert(last_import + 1, inject)
        text = '\n'.join(lines)
        
        text = re.sub(r'[\'\"`]http://localhost:8000([^\'\"`]*)[\'\"`]', r'`${API_URL}\1`', text)
        text = re.sub(r'[\'\"`]ws://localhost:8000([^\'\"`]*)[\'\"`]', r'`${WS_URL}\1`', text)
        
        with open(f, 'w', encoding='utf-8') as file:
            file.write(text)
print("Refactoring complete.")
