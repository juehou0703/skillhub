import { useState } from 'react';

const sections = [
  {
    id: 'install',
    title: 'Install MCP Server',
    content: `## Install the SkillHub MCP Server

The SkillHub MCP server connects Claude to the skill marketplace, letting you invoke any published skill directly from Claude Code or Claude Desktop.

### Prerequisites

- **Bun** v1.0+ or **Node.js** v18+
- A SkillHub account with an API key (get one from the Dashboard)

### Quick Start

Install the MCP server globally:

\`\`\`bash
bun install -g @skillhub/mcp-server
\`\`\`

Or with npm:

\`\`\`bash
npm install -g @skillhub/mcp-server
\`\`\`

### Configure Claude Code

Add the SkillHub MCP server to your Claude Code configuration. Edit \`~/.claude/settings.json\`:

\`\`\`json
{
  "mcpServers": {
    "skillhub": {
      "command": "skillhub-mcp",
      "args": ["--api-key", "YOUR_API_KEY"],
      "env": {
        "SKILLHUB_API_URL": "https://api.skillhub.dev"
      }
    }
  }
}
\`\`\`

Or use the CLI shortcut:

\`\`\`bash
skillhub-mcp init --api-key YOUR_API_KEY
\`\`\`

### Configure Claude Desktop

For Claude Desktop, add the server in **Settings → Developer → MCP Servers**:

\`\`\`json
{
  "mcpServers": {
    "skillhub": {
      "command": "skillhub-mcp",
      "args": ["--api-key", "YOUR_API_KEY"]
    }
  }
}
\`\`\`

### Verify Installation

Once configured, restart Claude and test:

\`\`\`
You: Use the skillhub_list tool to show available skills
\`\`\`

You should see a list of skills from the marketplace. If you get an error, check that your API key is valid and the server is running.`,
  },
  {
    id: 'usage',
    title: 'Using Skills',
    content: `## Using Skills

Once the MCP server is connected, you can invoke any skill from the marketplace directly in Claude.

### Browsing Skills

Ask Claude to list available skills:

\`\`\`
You: What skills are available on SkillHub?
\`\`\`

Or filter by category:

\`\`\`
You: Show me SkillHub skills for code analysis
\`\`\`

### Invoking a Skill

Invoke a skill by name:

\`\`\`
You: Use the code-review skill to review my last commit
\`\`\`

Claude will call the skill via MCP, and you'll see the result inline. Each invocation is billed to your SkillHub balance.

### Passing Parameters

Some skills accept parameters:

\`\`\`
You: Use the translate skill with target_language="Spanish" on this paragraph: ...
\`\`\`

Check each skill's detail page on the Browse tab for its full parameter list.`,
  },
  {
    id: 'api-keys',
    title: 'API Keys',
    content: `## API Keys

Your API key authenticates requests from the MCP server to SkillHub.

### Generating a Key

1. Go to the **Dashboard** tab
2. Click **Generate API Key**
3. Copy the key — it's only shown once

### Key Security

- Never commit your API key to version control
- Use environment variables in CI/CD:

\`\`\`bash
export SKILLHUB_API_KEY=sk_live_...
skillhub-mcp --api-key $SKILLHUB_API_KEY
\`\`\`

### Rotating Keys

To rotate a compromised key:

1. Generate a new key from the Dashboard
2. Update your MCP configuration with the new key
3. The old key is automatically revoked`,
  },
  {
    id: 'publishing',
    title: 'Publishing Skills',
    content: `## Publishing Skills

Share your expertise by publishing skills to the marketplace.

### Skill Format

Skills are defined as \`SKILL.md\` files with frontmatter:

\`\`\`markdown
---
name: my-skill
description: What this skill does
version: 1.0.0
price: 0.05
category: Developer Tools
model: claude-sonnet-4-6
---

# System Prompt

You are a specialist that...

## Instructions

When invoked, you should...
\`\`\`

### Publishing via CLI

\`\`\`bash
skillhub-mcp publish ./SKILL.md
\`\`\`

### Publishing via Web

Use the **Creator** tab to fill in the skill details and publish directly from the browser.

### Pricing

Set your price per invocation (minimum $0.01). SkillHub takes a 20% platform fee. Earnings are tracked on your Dashboard.`,
  },
];

function renderMarkdown(md: string) {
  const lines = md.split('\n');
  const elements: JSX.Element[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code blocks
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <div className="docs-code-block" key={key++}>
          {lang && <div className="docs-code-lang">{lang}</div>}
          <pre><code>{codeLines.join('\n')}</code></pre>
        </div>
      );
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      elements.push(<h4 className="docs-h3" key={key++}>{line.slice(4)}</h4>);
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(<h3 className="docs-h2" key={key++}>{line.slice(3)}</h3>);
      i++;
      continue;
    }

    // List items
    if (line.startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul className="docs-list" key={key++}>
          {items.map((item, j) => (
            <li key={j} dangerouslySetInnerHTML={{ __html: inlineMarkdown(item) }} />
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ''));
        i++;
      }
      elements.push(
        <ol className="docs-list" key={key++}>
          {items.map((item, j) => (
            <li key={j} dangerouslySetInnerHTML={{ __html: inlineMarkdown(item) }} />
          ))}
        </ol>
      );
      continue;
    }

    // Paragraphs
    if (line.trim()) {
      elements.push(
        <p className="docs-paragraph" key={key++} dangerouslySetInnerHTML={{ __html: inlineMarkdown(line) }} />
      );
    }
    i++;
  }

  return elements;
}

function inlineMarkdown(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '<code class="docs-inline-code">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('install');
  const current = sections.find((s) => s.id === activeSection)!;

  return (
    <div>
      <div className="page-header">
        <h1>Documentation</h1>
        <p className="subtitle">Get started with the SkillHub MCP server</p>
      </div>

      <div className="docs-layout">
        <aside className="docs-sidebar">
          {sections.map((s) => (
            <button
              key={s.id}
              className={`docs-nav-item ${activeSection === s.id ? 'active' : ''}`}
              onClick={() => setActiveSection(s.id)}
            >
              {s.title}
            </button>
          ))}
        </aside>

        <article className="docs-content">
          {renderMarkdown(current.content)}
        </article>
      </div>
    </div>
  );
}
