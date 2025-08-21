# How Bad Is Your Code  

**How Bad Is Your Code** is a tool that connects with your GitHub repositories and uses AI to analyze code quality. It provides direct, no-fluff feedback on readability, maintainability, and potential issues.  

## Features  
- Connect to your GitHub account to fetch repositories.  
- Analyze selected repositories with AI.  
- Get plain, straightforward feedback on your code quality.  

## Planned Changes  
- Add a loading screen while analyzing so it doesn’t look stuck.  
- Expand analysis for specific repositories.  
- Add time clock adjustments to track when analysis was done.  

## Setup  
1. Clone the repository  
   ```bash
   git clone <your-repo-link>
   cd <your-repo-name>
Install dependencies

bash
Copy
Edit
npm install
Set up your environment variables in a .env file:

bash
Copy
Edit
REACT_APP_GITHUB_TOKEN=your_github_token  
REACT_APP_OPENAI_API_KEY=your_openai_api_key  
Run the project

bash
Copy
Edit
npm start
