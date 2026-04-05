import { useState, useCallback } from 'react';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);
  return (
    <button className={`docs-copy-btn ${copied ? 'docs-copy-btn-copied' : ''}`} onClick={handleCopy} title="Copy to clipboard">
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

const sections = [
  {
    id: 'install',
    title: 'Connect to SkillHub',
    content: `## Connect to SkillHub

No package to install. Just add your API key to Claude's config and your skills appear as tools automatically.

### Step 1 — Get your API key

Go to the **Dashboard** tab and copy your API key. The test key is:

\`\`\`
sk_test_skillhub_user_001
\`\`\`

### Step 2 — Add SkillHub to Claude Code

Open \`~/.claude/settings.json\` and paste this block, replacing \`YOUR_API_KEY\`:

\`\`\`json
{
  "mcpServers": {
    "skillhub": {
      "type": "http",
      "url": "https://skillhub-two.vercel.app/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
\`\`\`

### Step 2 (alternative) — Add to Claude Desktop

In Claude Desktop go to **Settings → Developer → MCP Servers** and paste:

\`\`\`json
{
  "mcpServers": {
    "skillhub": {
      "type": "http",
      "url": "https://skillhub-two.vercel.app/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
\`\`\`

### Step 3 — Verify the connection

Restart Claude, then paste this directly into the chat:

\`\`\`
List only the tools available from the SkillHub MCP server. Ignore all native Claude Code skills and slash commands — I only want to see tools registered via the external SkillHub MCP connection at skillhub-two.vercel.app.
\`\`\`

You should see your marketplace skills listed. If Claude lists its own built-in skills instead, make sure you include "MCP server tool" or "SkillHub MCP" in your prompt — Claude can otherwise confuse native skills with marketplace tools.`,
  },
  {
    id: 'usage',
    title: 'Using Skills',
    content: `## Using Skills

Once connected, paste any of these prompts directly into Claude — no extra setup needed.

**Important:** Always say "SkillHub MCP tool" in your prompt. Claude has its own built-in skills and can mix them up with marketplace tools if you're not explicit.

### See what skills you have access to

\`\`\`
List only the tools from the SkillHub MCP server — not native Claude skills.
\`\`\`

### Run a code review

\`\`\`
Use the SkillHub MCP tool `review` on the following code and give me a detailed assessment:

[paste your code here]
\`\`\`

### Run a design review

\`\`\`
Use the SkillHub MCP tool `design-review` on the following and give me actionable feedback:

[paste your design description, screenshot, or spec here]
\`\`\`

### Run a benchmark / analysis

\`\`\`
Use the SkillHub MCP tool `benchmark` to evaluate the following and give me a structured report:

[paste what you want benchmarked]
\`\`\`

### Run a CEO-level business review

\`\`\`
Use the SkillHub MCP tool `plan-ceo-review` on this plan and tell me what a CEO would flag:

[paste your plan or document here]
\`\`\`

### Run office hours (general expert Q&A)

\`\`\`
Use the SkillHub MCP tool `office-hours`. My question is:

[paste your question here]
\`\`\`

### Tips

- Each invocation is billed to your SkillHub balance — check your Dashboard to track usage.
- You can pass any amount of context after the skill name. The more detail you give, the better the output.
- Always reference skills as "SkillHub MCP tool \`slug\`" to avoid Claude using its own built-ins instead.

### Passing Parameters

Some skills accept parameters:

\`\`\`
Use the SkillHub MCP tool `translate` with target_language="Spanish" on this paragraph: ...
\`\`\`

Check each skill's detail page on the Browse tab for its full parameter list.`,
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    content: `## Troubleshooting

If Claude isn't showing your SkillHub tools, you can manually verify the MCP connection with curl.

### Full MCP handshake (3 steps)

The MCP protocol requires an initialization handshake before you can list tools. Run all three steps in order.

**Step 1 — Initialize and capture the session ID**

\`\`\`bash
INIT_RESP=$(curl -s -D - -X POST https://skillhub-two.vercel.app/mcp \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -H "Accept: text/event-stream, application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}')

SESSION_ID=$(echo "$INIT_RESP" | grep -i "mcp-session-id" | awk '{print $2}' | tr -d '\\r')
echo "Session: $SESSION_ID"
\`\`\`

You should see a session ID printed and a response like:
\`\`\`
data: {"result":{"protocolVersion":"2024-11-05","capabilities":{"tools":{"listChanged":true}},"serverInfo":{"name":"skillhub-marketplace","version":"0.1.0"}},"jsonrpc":"2.0","id":1}
\`\`\`

**Step 2 — Send the initialized notification**

\`\`\`bash
curl -s -X POST https://skillhub-two.vercel.app/mcp \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -H "mcp-session-id: $SESSION_ID" \\
  -d '{"jsonrpc":"2.0","method":"notifications/initialized"}'
\`\`\`

**Step 3 — List all tools**

\`\`\`bash
curl -s -X POST https://skillhub-two.vercel.app/mcp \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -H "Accept: text/event-stream, application/json" \\
  -H "mcp-session-id: $SESSION_ID" \\
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
\`\`\`

This returns the full list of tools registered for your account. If you see tools here but not in Claude, the issue is with how Claude Code is reading the MCP config — double-check \`~/.claude/settings.json\`.

### Common errors

- **401 Unauthorized** — API key is missing or wrong. Check the \`Authorization: Bearer ...\` header.
- **404 on /mcp** — The session ID is stale (server restarted). Redo Step 1 to get a new session.
- **Method not found on tools/list** — You skipped Step 2. The initialized notification must be sent before listing tools.
- **Empty tools list** — Your account has no skills granted. Make sure skills exist in the Browse tab and are accessible to your user.`,
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
      const codeText = codeLines.join('\n');
      elements.push(
        <div className="docs-code-block" key={key++}>
          <div className="docs-code-header">
            {lang && <div className="docs-code-lang">{lang}</div>}
            <CopyButton text={codeText} />
          </div>
          <pre><code>{codeText}</code></pre>
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
