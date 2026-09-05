import os
import re
import json

def get_kotlin_files(directory):
    kt_files = []
    exclude_list = ["GroceryListWidget.kt", "AuthPage.kt", "SpressoOverlayUI.kt", "CameraBottomBar.kt"]
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.kt') and file not in exclude_list:
                kt_files.append(os.path.join(root, file))
    return kt_files

def extract_button_handlers(file_path):
    handlers = []
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Regex to find onClick = { ... } blocks
    # This is a basic regex and might not catch nested brackets perfectly, 
    # but it works well for simple one-liners or short blocks.
    onclick_pattern = re.compile(r'onClick\s*=\s*\{([^}]*)\}', re.DOTALL)
    
    for match in onclick_pattern.finditer(content):
        handler_body = match.group(1).strip()
        
        # Check for function calls or state variables in the body
        function_calls = re.findall(r'(\w+)\s*\(', handler_body)
        state_vars = re.findall(r'(\w+)\s*=', handler_body)
        
        # Heuristically check if there's an actual call (ignore empty or just comments)
        if not handler_body or handler_body.startswith('//'):
            continue
            
        handlers.append({
            'body': handler_body,
            'functions_called': list(set(function_calls)),
            'state_mutations': list(set(state_vars))
        })
        
    return handlers

def analyze_buttons(src_dirs):
    report = {}
    for d in src_dirs:
        kt_files = get_kotlin_files(d)
        for f in kt_files:
            handlers = extract_button_handlers(f)
            if handlers:
                # Store relative path for readability
                rel_path = os.path.relpath(f, start=os.getcwd())
                report[rel_path] = handlers
    return report

if __name__ == "__main__":
    src_dirs = [
        "composeApp"
        
        
        
    ]
    
    report = analyze_buttons(src_dirs)
    
    print("# Button Call Stack Trace & State Audit")
    print("This report traces the `onClick` handlers across all Compose files to identify function calls and state mutations.\\n")
    
    for file, handlers in report.items():
        print(f"### File: `{file}`")
        for i, h in enumerate(handlers):
            print(f"- **Handler {i+1}**:")
            print(f"  - **Body**:\\n```kotlin\\n{h['body']}\\n```")
            print(f"  - **Functions Called**: {', '.join(h['functions_called']) if h['functions_called'] else '*None*'}")
            print(f"  - **State Mutations**: {', '.join(h['state_mutations']) if h['state_mutations'] else '*None*'}")
        print()
