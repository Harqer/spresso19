import os
import sys
import subprocess
import google.generativeai as genai

def run_cmd(cmd):
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Command failed: {cmd}\nOutput: {result.stdout}\nError: {result.stderr}")
        return False
    return True

def main():
    gemini_key = os.environ.get("GEMINI_API_KEY")

    if not gemini_key:
        print("Error: GEMINI_API_KEY is missing. Self-healing aborted.")
        sys.exit(1)

    print("Self-Healing Agent Activated.")
    print("Intercepting CI failure logs...")

    if not os.path.exists("build_log.txt"):
        print("build_log.txt not found. Cannot proceed.")
        sys.exit(1)

    with open("build_log.txt", "r") as f:
        log_content = f.read()

    # Take the last 5000 chars of the log
    log_tail = log_content[-5000:]
    
    print(f"Read {len(log_tail)} characters from build log.")
    genai.configure(api_key=gemini_key)
    
    model = genai.GenerativeModel('gemini-1.5-pro')
    
    prompt = f"""
    You are an expert Kotlin/Android developer.
    The CI build just failed. Below is the tail of the build log.
    Identify the issue and provide a unified git patch to fix the error.
    
    OUTPUT ONLY THE UNIFIED DIFF CONTENT. DO NOT include markdown code blocks around it. DO NOT include any other text or explanations.
    
    BUILD LOG:
    {log_tail}
    """
    
    try:
        response = model.generate_content(prompt)
        patch_text = response.text.strip()
        
        # Remove markdown if the model accidentally included it
        if patch_text.startswith("```diff"):
            patch_text = patch_text[7:]
        elif patch_text.startswith("```"):
            patch_text = patch_text[3:]
        if patch_text.endswith("```"):
            patch_text = patch_text[:-3]
            
        patch_text = patch_text.strip()
            
    except Exception as e:
        print(f"Failed to generate patch from Gemini: {e}")
        sys.exit(1)

    if not patch_text:
        print("Empty patch generated. Aborting.")
        sys.exit(1)

    with open("fix.patch", "w") as f:
        f.write(patch_text + "\n")
        
    print("Auto-fix generated. Applying patch...")
    if not run_cmd("git apply fix.patch"):
        print("Failed to apply patch. Aborting.")
        sys.exit(1)

    print("Patch applied successfully. Pushing to repository...")
    run_cmd('git config --global user.name "GitHub Action Auto-Fixer"')
    run_cmd('git config --global user.email "actions@github.com"')
    run_cmd('git commit -am "fix: AI auto-heal"')
    
    if run_cmd('git push origin HEAD'):
        print("Self-healing complete. The pipeline will automatically retry.")
    else:
        print("Failed to push changes.")
        sys.exit(1)

if __name__ == "__main__":
    main()
