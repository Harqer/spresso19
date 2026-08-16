import os
import sys
import requests
import google.generativeai as genai
from github import Github

def main():
    repo_name = os.environ.get("REPO_NAME")
    pr_number = os.environ.get("PR_NUMBER")
    github_token = os.environ.get("GITHUB_TOKEN")
    gemini_key = os.environ.get("GEMINI_API_KEY")

    if not gemini_key:
        print("Error: GEMINI_API_KEY is missing. Please add it to your GitHub Repository Secrets.")
        sys.exit(1)
    if not github_token:
        print("Error: GITHUB_TOKEN is missing.")
        sys.exit(1)

    print(f"Executing Multi-Agent PR Review for {repo_name}#{pr_number}...")
    
    # 1. Fetch PR Diff using GitHub API
    headers = {
        "Authorization": f"token {github_token}",
        "Accept": "application/vnd.github.v3.diff"
    }
    diff_url = f"https://api.github.com/repos/{repo_name}/pulls/{pr_number}"
    response = requests.get(diff_url, headers=headers)
    
    if response.status_code != 200:
        print(f"Failed to fetch diff: {response.status_code}")
        sys.exit(1)
        
    diff_text = response.text
    if not diff_text.strip():
        print("Diff is empty, nothing to review.")
        sys.exit(0)

    # 2. Call Gemini API to review
    print(f"Fetched diff: {len(diff_text)} characters. Sending to Multi-Agent Team...")
    genai.configure(api_key=gemini_key)
    
    # Use the pro model for deep code review
    model = genai.GenerativeModel('gemini-1.5-pro')
    
    prompt = f"""
    You are an expert Senior Staff Engineer. Review the following pull request diff.
    Look for security vulnerabilities, bugs, logic errors, architectural flaws, and violation of first-principles.
    Provide a concise, professional markdown-formatted code review.
    Focus on substantive issues rather than nitpicks.

    DIFF:
    ```diff
    {diff_text}
    ```
    """
    
    try:
        review_response = model.generate_content(prompt)
        review_body = review_response.text
    except Exception as e:
        print(f"Failed to generate review from Gemini: {e}")
        sys.exit(1)

    # 3. Post comments using PyGithub
    print("Review generated. Posting to GitHub PR...")
    g = Github(github_token)
    repo = g.get_repo(repo_name)
    pr = repo.get_pull(int(pr_number))
    
    comment_body = f"## 🤖 Agentic PR Review\n\n{review_body}"
    pr.create_issue_comment(comment_body)
    
    print("Multi-Agent Review complete and posted.")

if __name__ == "__main__":
    main()
