'use client'

import { signIn } from 'next-auth/react'
import Image from 'next/image'
import styles from './HomePage.module.css'

export default function HomePage() {
  return (
    <>
      <div className="prism-background">
        <div className="prism-orb"></div>
        <div className="prism-orb"></div>
      </div>
      
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.content}>
            <div className={styles.badge}>
              <span className={styles.badgeIcon}>✨</span> 
              <span>2025 Edition Now Live</span>
            </div>
            
            <h1 className={styles.title}>
              Your Year in <br />
              <span className="text-gradient">Code & Commits</span>
            </h1>
            
            <p className={styles.subtitle}>
              Transform your GitHub contribution history into a beautiful, 
              AI-powered story. Discover your coding personality, 
              achievements, and impact.
            </p>
            
            <div className={styles.actions}>
              <button 
                onClick={() => signIn('github', { callbackUrl: '/dashboard' })}
                className={styles.primaryButton}
              >
                <span className={styles.githubIcon}>
                  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
                </span>
                Connect with GitHub
              </button>
              <a href="#how-it-works" className={styles.secondaryButton}>
                How it works
              </a>
            </div>

            <div className={styles.stats}>
              <div className={styles.statItem}>
                <span className={styles.statValue}>100%</span>
                <span className={styles.statLabel}>Privacy First</span>
              </div>
              <div className={styles.statDivider}></div>
              <div className={styles.statItem}>
                <span className={styles.statValue}>GPT-4o</span>
                <span className={styles.statLabel}>Powered Analysis</span>
              </div>
              <div className={styles.statDivider}></div>
              <div className={styles.statItem}>
                <span className={styles.statValue}>Free</span>
                <span className={styles.statLabel}>Open Source</span>
              </div>
            </div>
          </div>

          <div className={styles.visual}>
            <div className={styles.imageWrapper}>
              <div className={styles.glowBehind}></div>
              <Image 
                src="/GithubWrapped-Hero.webp" 
                alt="GitHub Wrapped Preview" 
                width={800} 
                height={600}
                priority
                className={styles.heroImage}
              />
            </div>
          </div>
        </div>

        <div id="how-it-works" className={styles.featuresSection}>
          <h2 className={styles.sectionTitle}>How it works</h2>
          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIconWrapper}>
                <span className={styles.featureIcon}>🔐</span>
              </div>
              <h3>Secure Auth</h3>
              <p>Connect securely with GitHub OAuth. We only access the data you choose to share.</p>
            </div>
            
            <div className={styles.featureCard}>
              <div className={styles.featureIconWrapper}>
                <span className={styles.featureIcon}>🤖</span>
              </div>
              <h3>AI Analysis</h3>
              <p>Our AI analyzes your commit history to generate personalized insights and summaries.</p>
            </div>
            
            <div className={styles.featureCard}>
              <div className={styles.featureIconWrapper}>
                <span className={styles.featureIcon}>🎁</span>
              </div>
              <h3>Your Wrapped</h3>
              <p>Get a beautiful, shareable summary of your year in code, ready to export.</p>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
