'use client'

import { signIn } from 'next-auth/react'
import styles from './HomePage.module.css'

export default function HomePage() {
  return (
    <>
      <div className="prism-background">
        <div className="prism-orb"></div>
        <div className="prism-orb"></div>
      </div>
      
      <main className={styles.main}>
        <div className="container">
          <div className={styles.hero}>
            <h1 className={styles.title}>
              <span className="text-gradient">GitHub Wrapped</span>
            </h1>
            <p className={styles.subtitle}>
              Generate beautiful, AI-powered analytics summaries of your GitHub contributions
            </p>
            
            <div className={styles.features}>
              <div className="glass-card">
                <div className={styles.featureIcon}>🔐</div>
                <h3>Secure Authentication</h3>
                <p>Login with your GitHub account via OAuth</p>
              </div>
              
              <div className="glass-card">
                <div className={styles.featureIcon}>🤖</div>
                <h3>AI-Powered Analysis</h3>
                <p>Automated summaries using GPT-4</p>
              </div>
              
              <div className="glass-card">
                <div className={styles.featureIcon}>📊</div>
                <h3>Accurate Statistics</h3>
                <p>Real data from GitHub API - no invented stats</p>
              </div>
              
              <div className="glass-card">
                <div className={styles.featureIcon}>🎨</div>
                <h3>Beautiful UI</h3>
                <p>Glassmorphism design with stunning animations</p>
              </div>
            </div>
            
            <button 
              onClick={() => signIn('github', { callbackUrl: '/dashboard' })}
              className="btn btn-primary"
              style={{ marginTop: '40px', fontSize: '1.1rem', padding: '16px 40px' }}
            >
              <span>🚀</span>
              Login with GitHub
            </button>
            
            <p className={styles.privacy}>
              We only access repository data you select. No data is stored permanently.
            </p>
          </div>
        </div>
      </main>
    </>
  )
}
