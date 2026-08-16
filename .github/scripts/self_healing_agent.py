import os
import sys
import json
import subprocess
import google.generativeai as genai
from github import Github

def run_cmd(cmd):
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Command failed: {cmd}\nOutput: {result.stdout}\nError: {result.stderr}")
        return False
    return True

def main():
    gemini_key = os.environ.get("GEMINI_API_KEY")
    github_token = os.environ.get("GITHUB_TOKEN")
    repo_name = os.environ.get("GITHUB_REPOSITORY") # format: owner/repo

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
    
    # Read Deep Wiki for architectural context
    wiki_context = ""
    wiki_path = "docs/wiki/docs/architecture.md"
    if os.path.exists(wiki_path):
        with open(wiki_path, "r") as f:
            wiki_context = f.read()
    else:
        print("Warning: Deep Wiki architecture context not found at docs/wiki/docs/architecture.md")

    genai.configure(api_key=gemini_key)
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    prompt = f"""
    You are an expert Kotlin/Android developer and AI orchestrator.
    The CI build just failed. Below is the tail of the build log and our Spresso Architecture Context from our Deep Wiki.
    
    Your task:
    1. Identify the issue.
    2. Provide a unified git patch to fix the error.
    3. Evaluate the complexity of the change. Is it a simple fix (like a syntax error, dependency bump) or a complex one (changing a feature, refactoring architecture, or changing business logic)?
    
    Respond in STRICT JSON format:
    {{
        "patch": "unified diff patch text here",
        "complexity": "simple" | "complex",
        "reasoning": "brief explanation"
    }}
    
    WIKI CONTEXT:
    {wiki_context[:3000]} # Limit wiki size
    
    BUILD LOG:
    {log_tail}
    """
    
    try:
        response = model.generate_content(prompt, generation_config={"response_mime_type": "application/json"})
        response_data = json.loads(response.text)
        patch_text = response_data.get("patch", "")
        complexity = response_data.get("complexity", "simple")
        print(f"Agent determination: {complexity.upper()} fix. Reasoning: {response_data.get('reasoning')}")
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

    run_cmd('git config --global user.name "GitHub Action Auto-Fixer"')
    run_cmd('git config --global user.email "actions@github.com"')
    run_cmd('git commit -am "fix: AI auto-heal based on deep wiki"')
    
    if complexity == "simple":
        print("Patch is simple. Pushing directly to current branch...")
        if run_cmd('git push origin HEAD'):
            print("Self-healing complete. The pipeline will automatically retry.")
        else:
            print("Failed to push changes.")
            sys.exit(1)
    else:
        print("Patch is COMPLEX. Branching off and creating a PR for the cyclical multi-agent loop...")
        branch_name = f"auto-heal-complex-{os.environ.get('GITHUB_RUN_ID', 'fallback')}"
        run_cmd(f'git checkout -b {branch_name}')
        
        if run_cmd(f'git push origin {branch_name}'):
            print(f"Branch {branch_name} pushed. Creating PR...")
            if github_token and repo_name:
                try:
                    g = Github(github_token)
                    repo = g.get_repo(repo_name)
                    pr = repo.create_pull(
                        title="🔧 AI Auto-Heal: Complex Fix Required",
                        body=f"## 🤖 Agentic Self-Healing\nThe CI failed and I generated a fix. Because this involves a complex logic/feature change, I have opened a PR for Antigravity (conversational agent) to pull and refine iteratively.\n\n**Reasoning:** {response_data.get('reasoning')}",
                        head=branch_name,
                        base="main"
                    )
                    print(f"PR created successfully: {pr.html_url}")
                except Exception as e:
                    print(f"Error creating PR: {e}")
            else:
                print("Missing GITHUB_TOKEN or GITHUB_REPOSITORY. Cannot create PR automatically.")
        else:
            print("Failed to push complex fix branch.")
            sys.exit(1)

    import urllib.request
    webhook_url = os.environ.get("WEBHOOK_URL")
    if webhook_url:
        print(f"Dispatching local webhook notification to {webhook_url}...")
        payload = {
            "repository": repo_name,
            "complexity": complexity,
            "reasoning": response_data.get('reasoning'),
            "pr_url": pr.html_url if complexity != "simple" and 'pr' in locals() else ""
        }
        try:
            req = urllib.request.Request(webhook_url, data=json.dumps(payload).encode("utf-8"), headers={"Content-Type": "application/json"})
            urllib.request.urlopen(req, timeout=10)
            print("Webhook successfully dispatched!")
        except Exception as e:
            print(f"Failed to dispatch webhook: {e}")

if __name__ == "__main__":
    main()
