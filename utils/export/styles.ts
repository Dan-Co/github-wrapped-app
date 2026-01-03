/**
 * Export Styles - CSS for the static HTML export
 */

export function getExportStyles(): string {
  return `
    :root {
      --bg-dark: #030303;
      --prism-1: #ff00c1;
      --prism-2: #9600ff;
      --prism-3: #4900ff;
      --prism-4: #00b8ff;
      --prism-5: #00fff9;
      --glass: rgba(255, 255, 255, 0.03);
      --glass-hover: rgba(255, 255, 255, 0.06);
      --border: rgba(255, 255, 255, 0.12);
      --text-main: rgba(255, 255, 255, 0.95);
      --text-dim: rgba(255, 255, 255, 0.6);
      --font-mono: 'JetBrains Mono', monospace;
    }
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Inter', sans-serif;
      background: var(--bg-dark);
      color: var(--text-main);
      min-height: 100vh;
      overflow-x: hidden;
    }
    
    /* Prism Background - matches app */
    .prism-background {
      position: fixed;
      inset: 0;
      z-index: -1;
      overflow: hidden;
      filter: blur(100px);
      opacity: 0.35;
    }
    
    .prism-orb {
      position: absolute;
      width: 80vw;
      height: 80vw;
      border-radius: 50%;
      background: conic-gradient(from 180deg at 50% 50%, var(--prism-1), var(--prism-2), var(--prism-3), var(--prism-4), var(--prism-5), var(--prism-1));
      animation: rotate 25s linear infinite;
    }
    
    .prism-orb:nth-child(2) {
      width: 50vw;
      height: 50vw;
      right: -10%;
      top: 50%;
      animation-duration: 30s;
      animation-direction: reverse;
    }
    
    @keyframes rotate {
      from { transform: translate(-20%, -20%) rotate(0deg); }
      to { transform: translate(-20%, -20%) rotate(360deg); }
    }
    
    /* Navigation */
    .nav {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 100;
      padding: 20px 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(3, 3, 3, 0.8);
      backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--border);
    }
    
    .nav-left {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    
    .nav-logo {
      font-family: var(--font-mono);
      font-weight: 700;
      font-size: 1.2rem;
      background: linear-gradient(135deg, var(--prism-4), var(--prism-5));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .export-date {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--text-dim);
      padding: 6px 12px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border);
      border-radius: 100px;
    }
    
    .nav-tabs {
      display: flex;
      gap: 8px;
      background: rgba(255, 255, 255, 0.05);
      padding: 4px;
      border-radius: 100px;
      border: 1px solid var(--border);
    }
    
    .nav-tab {
      padding: 8px 24px;
      border-radius: 100px;
      background: transparent;
      color: var(--text-dim);
      font-family: var(--font-mono);
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.3s ease;
      border: none;
    }
    
    .nav-tab:hover {
      color: var(--text-main);
    }
    
    .nav-tab.active {
      background: rgba(255, 255, 255, 0.1);
      color: var(--text-main);
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    }
    
    .mode-indicator {
      padding: 8px 16px;
      border-radius: 100px;
      font-size: 0.8rem;
      background: linear-gradient(135deg, rgba(0, 255, 249, 0.1), rgba(255, 0, 249, 0.1));
      border: 1px solid var(--border);
    }
    
    /* Main Content */
    .main {
      padding: 120px 40px 60px;
      max-width: 1400px;
      margin: 0 auto;
    }
    
    .tab-content {
      display: none;
      animation: fadeIn 0.5s ease;
    }
    
    .tab-content.active {
      display: block;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    /* Glass Card - matches app */
    .glass-card {
      background: var(--glass);
      backdrop-filter: blur(12px) saturate(180%);
      -webkit-backdrop-filter: blur(12px) saturate(180%);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
      transition: all 0.3s ease;
    }
    
    .glass-card:hover {
      transform: translateY(-4px);
      border-color: rgba(255, 255, 255, 0.2);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
    }
    
    /* Hero Section - matches app */
    .hero-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 24px;
      margin-bottom: 32px;
    }
    
    .hero-card {
      min-height: 280px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 32px;
      background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%);
      position: relative;
      overflow: hidden;
    }
    
    .hero-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 50%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent);
      transition: 0.6s;
    }
    
    .hero-card:hover::before {
      left: 150%;
    }
    
    .hero-card:hover {
      transform: translateY(-5px) scale(1.01);
      border-color: rgba(255, 255, 255, 0.25);
    }
    
    .label {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      color: var(--text-dim);
      margin-bottom: 12px;
    }
    
    .big-number {
      font-size: 4.5rem;
      font-weight: 900;
      line-height: 0.95;
      letter-spacing: -0.04em;
      background: linear-gradient(to bottom, #fff 40%, rgba(255, 255, 255, 0.4));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .big-number.mega {
      font-size: 6rem;
    }
    
    .hero-title {
      font-size: 1rem;
      font-weight: 400;
      line-height: 1.6;
      margin-top: 16px;
      color: var(--text-dim);
    }
    
    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 24px;
      margin-bottom: 32px;
    }
    
    .mono-value {
      font-family: var(--font-mono);
      font-size: 2rem;
      font-weight: 700;
      color: var(--prism-4);
    }
    
    .mono-value.small {
      font-size: 1.4rem;
    }
    
    .subtitle {
      font-size: 0.75rem;
      color: var(--text-dim);
      margin-top: 4px;
    }
    
    .green { color: #00ff88 !important; }
    .red { color: #ff6b6b !important; }
    
    /* Section Title - matches app */
    .section-title {
      font-size: 1.5rem;
      font-weight: 900;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .section-title::before {
      content: '';
      width: 4px;
      height: 24px;
      background: linear-gradient(to bottom, var(--prism-4), var(--prism-2));
      border-radius: 2px;
    }
    
    /* Language Bars - matches app */
    .language-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .language-item {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    
    .language-name {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      min-width: 100px;
      color: var(--text-dim);
    }
    
    .language-bar-container {
      flex: 1;
      height: 8px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      overflow: hidden;
    }
    
    .language-bar {
      height: 100%;
      border-radius: 4px;
      transition: width 0.5s ease;
    }
    
    .language-bar.typescript { background: linear-gradient(90deg, #3178c6, #00b8ff); }
    .language-bar.javascript { background: linear-gradient(90deg, #f7df1e, #ff9800); }
    .language-bar.python { background: linear-gradient(90deg, #3572A5, #00fff9); }
    .language-bar.default { background: linear-gradient(90deg, var(--prism-4), var(--prism-5)); }
    
    .language-percent {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--text-main);
      min-width: 50px;
      text-align: right;
    }
    
    /* Time Comparison - matches app */
    .time-comparison {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 40px;
      padding: 20px 0;
    }
    
    .time-block {
      text-align: center;
    }
    
    .time-label {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      color: var(--text-dim);
      margin-bottom: 12px;
    }
    
    .time-value {
      font-size: 4rem;
      font-weight: 900;
      background: linear-gradient(to bottom, #fff 40%, rgba(255, 255, 255, 0.4));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .time-value.highlight {
      background: linear-gradient(135deg, var(--prism-4), var(--prism-5));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .vs-badge {
      font-family: var(--font-mono);
      font-size: 1rem;
      font-weight: 700;
      padding: 12px 20px;
      background: linear-gradient(135deg, rgba(0, 255, 249, 0.2), rgba(255, 0, 249, 0.2));
      border: 1px solid var(--border);
      border-radius: 100px;
    }
    
    /* Repository Cards - matches app */
    .repos-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }
    
    .repo-card {
      position: relative;
      transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
      cursor: pointer;
      background: linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 24px;
      backdrop-filter: blur(10px);
    }
    
    .repo-card:hover {
      transform: translateY(-4px);
      background: linear-gradient(145deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%);
      border-color: rgba(255, 255, 255, 0.15);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    }
    
    .repo-card:hover {
      transform: translateY(-4px) scale(1.02);
      border-color: var(--prism-4);
    }
    
    .repo-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }
    
    .repo-name {
      font-family: var(--font-mono);
      font-size: 1.2rem;
      font-weight: 600;
      color: var(--prism-4);
    }
    
    .repo-lang {
      display: inline-block;
      padding: 4px 12px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 100px;
      font-size: 0.75rem;
      font-family: var(--font-mono);
      margin-bottom: 12px;
    }
    
    .repo-desc, .repo-summary {
      font-size: 0.9rem;
      color: var(--text-dim);
      line-height: 1.6;
      margin-bottom: 12px;
    }
    
    .repo-narrative {
      font-size: 0.85rem;
      color: var(--prism-5);
      margin-bottom: 12px;
      padding: 8px 12px;
      background: rgba(0, 255, 249, 0.05);
      border-left: 2px solid var(--prism-5);
      border-radius: 4px;
    }
    
    .repo-stats {
      display: flex;
      gap: 20px;
      padding: 12px 0;
      border-top: 1px solid var(--border);
      margin-top: 12px;
    }
    
    .stat {
      text-align: center;
    }
    
    .stat-value {
      font-family: var(--font-mono);
      font-size: 1.1rem;
      font-weight: 700;
    }
    
    .stat-label {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      text-transform: uppercase;
      color: var(--text-dim);
      margin-top: 4px;
    }
    
    .mode-badge {
      font-size: 0.8rem;
      padding: 4px 10px;
      border-radius: 100px;
    }
    
    .mode-badge.ai-mode {
      background: linear-gradient(135deg, rgba(0, 255, 249, 0.2), rgba(0, 184, 255, 0.2));
    }
    
    .mode-badge.manual-mode {
      background: rgba(255, 255, 255, 0.1);
    }
    
    .deployment-links {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }
    
    .deploy-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border);
      border-radius: 100px;
      color: var(--text-main);
      text-decoration: none;
      font-size: 0.8rem;
      transition: all 0.2s ease;
    }
    
    .deploy-link:hover {
      background: linear-gradient(135deg, rgba(0, 255, 249, 0.2), rgba(255, 0, 249, 0.2));
    }
    
    /* Repository Groups - matches app */
    .repo-group {
      margin-bottom: 40px;
    }
    
    .repo-group-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border);
    }
    
    .repo-group-icon {
      font-size: 1.5rem;
    }
    
    .repo-group-title {
      font-family: var(--font-mono);
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--prism-4);
    }
    
    .repo-group-count {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--text-dim);
      background: rgba(255,255,255,0.1);
      padding: 4px 10px;
      border-radius: 100px;
    }
    
    /* Development Profile - matches app */
    .dev-style-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    
    .dev-style-card {
      padding: 20px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border);
      border-radius: 12px;
      text-align: center;
      transition: all 0.3s ease;
    }
    
    .dev-style-card:hover {
      background: rgba(255, 255, 255, 0.05);
      transform: translateY(-2px);
    }
    
    .dev-style-icon {
      font-size: 2rem;
      margin-bottom: 8px;
    }
    
    .dev-style-value {
      font-family: var(--font-mono);
      font-size: 2rem;
      font-weight: 700;
      background: linear-gradient(135deg, var(--prism-4), var(--prism-5));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .dev-style-label {
      font-size: 0.9rem;
      margin-bottom: 4px;
    }
    
    .dev-style-sub {
      font-size: 0.75rem;
      color: var(--text-dim);
    }
    
    .lang-tag {
      display: inline-block;
      padding: 2px 8px;
      background: linear-gradient(135deg, rgba(0, 255, 249, 0.15), rgba(255, 0, 249, 0.15));
      border-radius: 100px;
      font-size: 0.65rem;
      font-family: var(--font-mono);
      margin-left: 6px;
    }
    
    /* AI Percentage Bar - matches app */
    .ai-percentage-section {
      padding: 16px 0 0;
      border-top: 1px solid var(--border);
    }
    
    .ai-percentage-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
      font-size: 0.85rem;
    }
    
    .ai-percentage-value {
      font-family: var(--font-mono);
      color: var(--prism-4);
      font-weight: 600;
    }
    
    .ai-percentage-bar {
      height: 12px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 8px;
    }
    
    .ai-percentage-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--prism-4), var(--prism-5));
      border-radius: 6px;
    }
    
    .ai-percentage-labels {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--text-dim);
    }
    
    /* Achievements - matches app */
    .achievements-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }
    
    .achievement {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: var(--glass);
      border: 1px solid var(--border);
      border-radius: 12px;
    }
    
    .achievement.legendary {
      border-color: #ffd700;
      background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), transparent);
    }
    
    .achievement.epic {
      border-color: #a855f7;
      background: linear-gradient(135deg, rgba(168, 85, 247, 0.1), transparent);
    }
    
    .achievement.rare {
      border-color: var(--prism-4);
      background: linear-gradient(135deg, rgba(0, 184, 255, 0.1), transparent);
    }
    
    .achievement-icon {
      font-size: 2rem;
    }
    
    .achievement-content {
      flex: 1;
    }
    
    .achievement-title {
      font-weight: 600;
      display: block;
      margin-bottom: 4px;
    }
    
    .achievement-desc {
      font-size: 0.8rem;
      color: var(--text-dim);
    }
    
    .achievement-rarity {
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--text-dim);
    }
    
    /* Featured Projects */
    .featured-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }
    
    .featured-card {
      padding: 24px;
      background: var(--glass);
      border: 2px solid;
      border-radius: 16px;
    }
    
    .featured-category {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.8rem;
      color: var(--text-dim);
      margin-bottom: 12px;
    }
    
    .featured-name {
      font-family: var(--font-mono);
      font-size: 1.2rem;
      margin-bottom: 8px;
    }
    
    .featured-headline {
      font-size: 1rem;
      color: var(--prism-5);
      margin-bottom: 8px;
    }
    
    .featured-desc {
      font-size: 0.85rem;
      color: var(--text-dim);
      line-height: 1.5;
    }
    
    /* AI Insights */
    .ai-stats-row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 16px;
    }
    
    .ai-stat-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border);
      border-radius: 100px;
      font-size: 0.85rem;
    }
    
    .ai-stats-note {
      font-size: 0.75rem;
      color: var(--text-dim);
      font-style: italic;
      padding: 10px 14px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 8px;
      margin-bottom: 20px;
    }
    
    .impact-cards-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }
    
    .impact-card-large {
      padding: 24px;
      border-radius: 16px;
    }
    
    .impact-card-large.cyan {
      background: linear-gradient(135deg, rgba(0, 255, 249, 0.1), transparent);
      border: 1px solid rgba(0, 255, 249, 0.2);
    }
    
    .impact-card-large.purple {
      background: linear-gradient(135deg, rgba(255, 0, 249, 0.1), transparent);
      border: 1px solid rgba(255, 0, 249, 0.2);
    }
    
    .impact-card-header {
      font-weight: 600;
      margin-bottom: 16px;
      font-size: 1rem;
    }
    
    .impact-list {
      list-style: none;
    }
    
    .impact-list li {
      display: flex;
      gap: 12px;
      margin-bottom: 12px;
      font-size: 0.9rem;
      line-height: 1.5;
    }
    
    .arrow.cyan { color: var(--prism-5); }
    .arrow.purple { color: #ff00f9; }
    
    /* Modal */
    .modal-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(10px);
      z-index: 1000;
      justify-content: center;
      align-items: center;
      padding: 40px;
      overflow-y: auto;
    }
    
    .modal-overlay.active {
      display: flex;
    }
    
    body.modal-open {
      overflow: hidden;
    }
    
    .modal-content {
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%);
      backdrop-filter: blur(20px);
      border: 1px solid var(--border);
      border-radius: 16px;
      max-width: 700px;
      width: 100%;
      max-height: 85vh;
      overflow-y: auto;
      animation: modalSlideIn 0.3s ease-out;
    }
    
    @keyframes modalSlideIn {
      from { opacity: 0; transform: translateY(30px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    
    .modal-header {
      padding: 28px 28px 0;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
    }
    
    .modal-header h2 {
      font-family: var(--font-mono);
      font-size: 1.4rem;
      font-weight: 700;
      color: var(--prism-4);
    }
    
    .modal-close {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid var(--border);
      border-radius: 50%;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--text-dim);
      font-size: 1.5rem;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }
    
    .modal-close:hover {
      background: rgba(255, 255, 255, 0.2);
      color: var(--text-main);
    }
    
    #modal-body {
      padding: 24px 28px 28px;
    }
    
    .modal-section {
      margin-bottom: 24px;
    }
    
    .modal-section h3 {
      font-size: 0.9rem;
      font-weight: 700;
      margin-bottom: 12px;
      color: var(--prism-5);
    }
    
    .modal-section p {
      font-size: 0.9rem;
      line-height: 1.6;
      color: var(--text-dim);
    }
    
    /* Enhanced Modal Styles - matching app */
    .modal-lang-chip {
      display: inline-block;
      padding: 4px 12px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 100px;
      font-size: 0.75rem;
      font-family: var(--font-mono);
      margin-right: 8px;
    }
    
    .modal-mode-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 100px;
      font-size: 0.75rem;
    }
    
    .modal-mode-badge.ai {
      background: linear-gradient(135deg, rgba(0, 255, 249, 0.2), rgba(0, 184, 255, 0.2));
      border: 1px solid rgba(0, 255, 249, 0.3);
    }
    
    .modal-mode-badge.manual {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid var(--border);
    }
    
    .modal-section-title {
      font-size: 0.9rem;
      font-weight: 700;
      margin-bottom: 12px;
      color: var(--prism-5);
    }
    
    .modal-section-title.cyan {
      color: var(--prism-4);
    }
    
    .modal-deploy-links {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .modal-deploy-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: rgba(0, 255, 249, 0.05);
      border: 1px solid rgba(0, 255, 249, 0.2);
      border-radius: 8px;
      color: var(--prism-4);
      font-family: var(--font-mono);
      font-size: 0.85rem;
      text-decoration: none;
      transition: all 0.2s ease;
    }
    
    .modal-deploy-chip:hover {
      background: rgba(0, 255, 249, 0.1);
      border-color: rgba(0, 255, 249, 0.4);
      transform: translateX(4px);
    }
    
    .auto-badge {
      padding: 2px 8px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 100px;
      font-size: 0.65rem;
      font-family: var(--font-mono);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-dim);
    }
    
    .modal-stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin: 20px 0;
    }
    
    .modal-stat-card {
      text-align: center;
      padding: 16px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border);
      border-radius: 12px;
    }
    
    .modal-stat-value {
      font-family: var(--font-mono);
      font-size: 1.5rem;
      font-weight: 700;
      display: block;
    }
    
    .modal-stat-value.cyan {
      color: var(--prism-4);
    }
    
    .modal-stat-value.green {
      color: #00ff88;
    }
    
    .modal-stat-value.red {
      color: #ff6b6b;
    }
    
    .modal-stat-label {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-dim);
      margin-top: 4px;
    }
    
    .modal-attribution-note {
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 8px;
      font-size: 0.8rem;
      color: var(--text-dim);
      text-align: center;
    }
    
    .modal-text {
      font-size: 0.9rem;
      line-height: 1.6;
      color: var(--text-dim);
    }
    
    .modal-highlights {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    
    .modal-highlights li {
      display: flex;
      gap: 10px;
      margin-bottom: 8px;
      font-size: 0.85rem;
      line-height: 1.6;
      color: var(--text-dim);
    }
    
    .highlight-arrow {
      color: var(--prism-4);
      flex-shrink: 0;
    }
    
    .modal-narrative {
      font-style: italic;
      font-size: 0.9rem;
      color: var(--text-dim);
      padding: 12px 16px;
      background: linear-gradient(135deg, rgba(255, 200, 100, 0.05), rgba(255, 150, 50, 0.05));
      border: 1px solid rgba(255, 200, 100, 0.2);
      border-radius: 8px;
      line-height: 1.7;
    }
    
    .modal-lang-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
    }
    
    .modal-lang-chip-bottom {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      padding: 6px 12px;
      background: rgba(0, 184, 255, 0.1);
      border: 1px solid rgba(0, 184, 255, 0.3);
      border-radius: 100px;
      color: var(--prism-4);
    }
    
    /* Year Narrative Section */
    .year-narrative {
      background: linear-gradient(135deg, rgba(255, 200, 100, 0.05), rgba(255, 150, 50, 0.03)) !important;
      border: 1px solid rgba(255, 200, 100, 0.2) !important;
    }
    
    .narrative-title {
      font-family: var(--font-mono);
      font-size: 1.4rem;
      font-weight: 700;
      margin-bottom: 16px;
      color: var(--prism-4);
    }
    
    .narrative-intro {
      font-size: 1.1rem;
      line-height: 1.7;
      color: var(--text-main);
      margin-bottom: 20px;
    }
    
    .narrative-context {
      padding: 16px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border);
      border-radius: 8px;
      font-size: 0.9rem;
      color: var(--text-dim);
      line-height: 1.6;
    }
    
    .narrative-context strong {
      color: var(--prism-5);
    }
    
    /* AI Insights Section */
    .ai-insights-section {
      margin-top: 32px;
    }
    
    .ai-insights-headline {
      font-family: var(--font-mono);
      font-size: 1.3rem;
      font-weight: 700;
      margin-bottom: 12px;
      color: var(--prism-4);
    }
    
    .ai-insights-description {
      font-size: 1rem;
      line-height: 1.7;
      color: var(--text-dim);
      margin-bottom: 24px;
    }
    
    .impact-cards-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }
    
    .impact-card-large {
      padding: 24px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border);
      border-radius: 16px;
    }
    
    .impact-card-large.cyan {
      border-color: rgba(0, 255, 249, 0.3);
      background: linear-gradient(135deg, rgba(0, 255, 249, 0.05), transparent);
    }
    
    .impact-card-large.purple {
      border-color: rgba(255, 0, 249, 0.3);
      background: linear-gradient(135deg, rgba(255, 0, 249, 0.05), transparent);
    }
    
    .impact-card-header {
      font-family: var(--font-mono);
      font-size: 1rem;
      font-weight: 700;
      margin-bottom: 16px;
    }
    
    .impact-card-header.cyan {
      color: var(--prism-4);
    }
    
    .impact-card-header.purple {
      color: var(--prism-5);
    }
    
    .impact-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    
    .impact-list li {
      display: flex;
      gap: 12px;
      margin-bottom: 12px;
      font-size: 0.9rem;
      line-height: 1.6;
      color: var(--text-dim);
    }
    
    .impact-list .arrow {
      flex-shrink: 0;
    }
    
    .impact-list .arrow.cyan {
      color: var(--prism-4);
    }
    
    .impact-list .arrow.purple {
      color: var(--prism-5);
    }
    
    /* Contribution Heatmap */
    .heatmap-container {
      padding: 20px;
      overflow-x: auto;
    }
    
    .heatmap-stats {
      display: flex;
      align-items: center;
      gap: 24px;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border);
    }
    
    .heatmap-stat-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .heatmap-stat-value {
      font-family: var(--font-mono);
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--text-main);
    }
    
    .heatmap-stat-label {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--text-dim);
    }
    
    .heatmap-stat-icon {
      font-size: 1rem;
    }
    
    .heatmap-months {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      gap: 0;
      margin-bottom: 8px;
    }
    
    .heatmap-month {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      color: var(--text-dim);
      text-align: left;
    }
    
    .heatmap-grid {
      display: grid;
      grid-template-columns: repeat(53, 1fr);
      gap: 3px;
    }
    
    .heat-week {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    
    .heat-cell {
      width: 100%;
      aspect-ratio: 1;
      min-width: 10px;
      min-height: 10px;
      border-radius: 2px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    
    .heat-cell.level1 {
      background: rgba(0, 255, 249, 0.2);
      border-color: rgba(0, 255, 249, 0.3);
    }
    
    .heat-cell.level2 {
      background: rgba(0, 255, 249, 0.4);
      border-color: rgba(0, 255, 249, 0.5);
    }
    
    .heat-cell.level3 {
      background: rgba(0, 255, 249, 0.6);
      border-color: rgba(0, 255, 249, 0.7);
    }
    
    .heat-cell.level4 {
      background: rgba(0, 255, 249, 0.8);
      border-color: rgba(0, 255, 249, 0.9);
    }
    
    .heatmap-legend {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 6px;
      margin-top: 12px;
      font-size: 0.7rem;
      color: var(--text-dim);
    }
    
    .heatmap-legend .heat-cell {
      width: 10px;
      height: 10px;
    }
    
    /* Scan Date Badge */
    .scan-date {
      font-family: var(--font-mono);
      font-size: 0.65rem;
      color: var(--text-dim);
      margin-top: 8px;
      opacity: 0.7;
    }
    
    /* Footer */
    .footer {
      text-align: center;
      color: var(--text-dim);
      font-size: 0.8rem;
      padding: 40px 0;
      border-top: 1px solid var(--border);
      margin-top: 60px;
    }
    
    /* Responsive */
    @media (max-width: 1000px) {
      .hero-grid { grid-template-columns: 1fr; }
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .big-number { font-size: 3rem; }
      .big-number.mega { font-size: 4rem; }
      .time-comparison { flex-direction: column; gap: 20px; }
      .time-value { font-size: 2.5rem; }
      .vs-badge { order: 2; }
    }
    
    @media (max-width: 700px) {
      .dev-style-grid { grid-template-columns: repeat(2, 1fr); }
      .impact-cards-grid { grid-template-columns: 1fr; }
      .nav { padding: 16px 20px; flex-wrap: wrap; gap: 12px; }
      .main { padding: 140px 20px 40px; }
      .repos-grid { grid-template-columns: 1fr; }
    }
    
    @media (max-width: 500px) {
      .dev-style-grid { grid-template-columns: 1fr; }
      .nav-tabs { flex-wrap: wrap; justify-content: center; }
      .stats-grid { grid-template-columns: 1fr; }
    }
  `.trim()
}
