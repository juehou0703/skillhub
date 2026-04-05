import { Link } from 'react-router-dom';


export default function HomePage() {
  return (
    <div className="home">

      {/* Hero */}
      <section className="home-hero">
        <div className="home-hero-badge">Now in beta · 157 skills available</div>
        <h1 className="home-hero-title">
          Expert Claude skills,<br />
          <span className="home-hero-accent">pay per use</span>
        </h1>
        <p className="home-hero-subtitle">
          SkillHub is a marketplace of curated Claude skills built by domain experts.
          Invoke them via MCP in Claude Code or Cowork — no subscriptions, no setup.
        </p>
        <div className="home-hero-actions">
          <Link to="/browse" className="btn btn-primary home-hero-cta">
            Get Started
          </Link>
          <Link to="/docs" className="btn home-hero-secondary">
            See how it works →
          </Link>
        </div>
      </section>

      {/* 3 feature boxes */}
      <section className="home-pillars">
        <div className="home-pillar">
          <div className="home-pillar-icon">🔍</div>
          <div className="home-pillar-title">Browse Skills</div>
          <div className="home-pillar-body">157 expert-built skills across legal, finance, writing, coding, and more.</div>
          <Link to="/browse" className="home-feature-link">Explore →</Link>
        </div>
        <div className="home-pillar-divider" />
        <div className="home-pillar">
          <div className="home-pillar-icon">⚡</div>
          <div className="home-pillar-title">Pay Per Use</div>
          <div className="home-pillar-body">No subscriptions. Top up your balance and pay only for what you invoke.</div>
          <Link to="/dashboard" className="home-feature-link">Dashboard →</Link>
        </div>
        <div className="home-pillar-divider" />
        <div className="home-pillar">
          <div className="home-pillar-icon">🚀</div>
          <div className="home-pillar-title">Create &amp; Earn</div>
          <div className="home-pillar-body">Upload a SKILL.md, set your price, and earn on every invocation.</div>
          <Link to="/creator" className="home-feature-link">Start creating →</Link>
        </div>
      </section>

      {/* Section 1: For skill users */}
      <section className="home-section">
        <div className="home-section-label">For skill users</div>
        <div className="home-section-inner home-section-users">

          <div className="home-section-text">
            <h2 className="home-section-title">Instant access to expert knowledge, billed per use</h2>
            <p className="home-section-body">
              No subscriptions. Pay only for what you invoke, billed to the cent.
            </p>
            <div className="home-section-points">
              <div className="home-section-point">
                <span className="home-section-point-icon">⚡</span>
                <span>Fractions of a cent to a few cents per invocation</span>
              </div>
              <div className="home-section-point">
                <span className="home-section-point-icon">🔌</span>
                <span>Native MCP — skills appear as tools in Claude Code and Cowork</span>
              </div>
              <div className="home-section-point">
                <span className="home-section-point-icon">📋</span>
                <span>Full usage history and token breakdown in your dashboard</span>
              </div>
            </div>
            <div className="home-section-actions">
              <Link to="/browse" className="btn btn-primary home-hero-cta">Browse Skills</Link>
              <Link to="/dashboard" className="home-feature-link">View dashboard →</Link>
            </div>
          </div>

          <div className="home-section-cards">
            <div className="home-user-card">
              <div className="home-user-card-header">
                <span className="home-user-card-icon">⚖️</span>
                <div>
                  <div className="home-user-card-name">Startup Lawyer</div>
                  <div className="home-user-card-category">Legal</div>
                </div>
                <div className="home-user-card-price">$0.04 / use</div>
              </div>
              <p className="home-user-card-desc">Reviews term sheets and SAFEs for founder-unfriendly clauses, liquidation preferences, and anti-dilution risks.</p>
              <div className="home-user-card-footer">
                <span className="home-user-card-model">claude-sonnet-4-6</span>
                <span className="home-user-card-invoke">Invoke →</span>
              </div>
            </div>
            <div className="home-user-card">
              <div className="home-user-card-header">
                <span className="home-user-card-icon">🧾</span>
                <div>
                  <div className="home-user-card-name">Tax Accountant</div>
                  <div className="home-user-card-category">Finance</div>
                </div>
                <div className="home-user-card-price">$0.03 / use</div>
              </div>
              <p className="home-user-card-desc">Analyzes income, expenses, and deductions to estimate quarterly taxes and flag potential audit triggers.</p>
              <div className="home-user-card-footer">
                <span className="home-user-card-model">claude-sonnet-4-6</span>
                <span className="home-user-card-invoke">Invoke →</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Section 2: For domain experts */}
      <section className="home-section home-section-alt">
        <div className="home-section-label home-section-label-dark">For domain experts</div>
        <div className="home-section-inner home-section-creators">

          <div className="home-section-text">
            <h2 className="home-section-title">Turn your expertise into recurring income — your prompt stays yours</h2>
            <p className="home-section-body">
              Upload a SKILL.md, set your price, and earn on every invocation — your prompt stays encrypted and private.
            </p>
            <div className="home-section-points">
              <div className="home-section-point">
                <span className="home-section-point-icon">🔒</span>
                <span><strong>Your prompt is fully private.</strong> Users see only the name and description — never your instructions.</span>
              </div>
              <div className="home-section-point">
                <span className="home-section-point-icon">💰</span>
                <span>Set your own price and get paid monthly via Stripe</span>
              </div>
              <div className="home-section-point">
                <span className="home-section-point-icon">📈</span>
                <span>Creator dashboard with invocations, revenue, and trends</span>
              </div>
            </div>
            <div className="home-section-actions">
              <Link to="/creator" className="btn btn-primary home-hero-cta">Start Creating</Link>
              <Link to="/docs" className="home-feature-link">Read the creator guide →</Link>
            </div>
          </div>

          <div className="home-creator-showcase">
            <div className="home-creator-step">
              <div className="home-creator-step-num">1</div>
              <div>
                <div className="home-creator-step-title">Write your SKILL.md</div>
                <div className="home-creator-step-body">Encode your domain knowledge as a Claude skill prompt — your secret sauce.</div>
              </div>
            </div>
            <div className="home-creator-step">
              <div className="home-creator-step-num">2</div>
              <div>
                <div className="home-creator-step-title">Upload &amp; set your price</div>
                <div className="home-creator-step-body">Paste your prompt into the creator dashboard. It's encrypted the moment it's saved.</div>
              </div>
            </div>
            <div className="home-creator-step">
              <div className="home-creator-step-num">3</div>
              <div>
                <div className="home-creator-step-title">Earn on every invocation</div>
                <div className="home-creator-step-body">Users invoke your skill, you get paid. Your prompt is never exposed.</div>
              </div>
            </div>
            <div className="home-creator-privacy-note">
              <span>🔒</span>
              <span>Prompts are stored encrypted. No user, admin, or third party can read your SKILL.md.</span>
            </div>
          </div>

        </div>
      </section>

      {/* CTA footer */}
      <section className="home-footer-cta">
        <h2>Ready to explore?</h2>
        <p>157 skills across legal, finance, writing, analysis, coding, and more.</p>
        <Link to="/browse" className="btn btn-primary home-hero-cta">
          Browse Skills
        </Link>
      </section>

    </div>
  );
}
