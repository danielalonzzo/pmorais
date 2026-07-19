import os
import glob
import re

google_site_verification = '<meta name="google-site-verification" content="6pM3Hbid02G0pl99EAhm1wfoVfeGjHTrc8scb37aRdk" />'

gtm_head = """<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-TNKJXJ9X');</script>
<!-- End Google Tag Manager -->"""

gtm_body = """<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-TNKJXJ9X"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->"""

files = glob.glob('**/*.html', recursive=True)

# Exclude node_modules, scratch, functions/node_modules
files = [f for f in files if 'node_modules' not in f and 'scratch' not in f and 'functions' not in f]

for filepath in files:
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        changed = False
        
        if filepath.endswith('index.html'):
            if google_site_verification not in content:
                content = content.replace('<head>', '<head>\n    ' + google_site_verification, 1)
                changed = True
        
        if gtm_head not in content:
            content = content.replace('<head>', '<head>\n    ' + gtm_head, 1)
            changed = True
            
        if gtm_body not in content:
            # We want to use a function as the replacement string in re.subn to avoid escape sequence issues
            def replace_body(match):
                return match.group(1) + '\n    ' + gtm_body
            content, count = re.subn(r'(<body[^>]*>)', replace_body, content, count=1)
            if count > 0:
                changed = True

        if changed:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Updated {filepath}")
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
