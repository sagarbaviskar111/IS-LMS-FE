"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError, PortfolioPublic } from "@/lib/api";
import styles from "./PortfolioPreview.module.css";

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function LocationIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45Z" />
    </svg>
  );
}

function NaukriIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M3 13h18" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.58 2 12.19c0 4.49 2.87 8.3 6.84 9.64.5.1.68-.22.68-.49 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .07 1.53 1.05 1.53 1.05.9 1.57 2.34 1.12 2.91.86.09-.66.35-1.12.64-1.38-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.73 0 0 .84-.28 2.75 1.05a9.3 9.3 0 0 1 2.5-.35c.85 0 1.71.12 2.5.35 1.91-1.33 2.75-1.05 2.75-1.05.55 1.42.2 2.47.1 2.73.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.6.69.49A10.02 10.02 0 0 0 22 12.19C22 6.58 17.52 2 12 2Z" />
    </svg>
  );
}

function WebsiteIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z" />
    </svg>
  );
}

function formatEduRange(startYear?: string, endYear?: string): string {
  if (startYear && endYear) return `${startYear} – ${endYear}`;
  if (startYear) return `${startYear} – Present`;
  if (endYear) return endYear;
  return "";
}

function formatExpRange(startDate?: string, endDate?: string, current?: boolean): string {
  if (startDate && current) return `${startDate} – Present`;
  if (startDate && endDate) return `${startDate} – ${endDate}`;
  if (startDate) return startDate;
  return "";
}

export default function StudentPortfolioPage() {
  const { slug } = useParams<{ slug: string }>();
  const [portfolio, setPortfolio] = useState<PortfolioPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .portfolioGetPublic(slug)
      .then((res) => {
        if (cancelled) return;
        setPortfolio(res.portfolio);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        } else {
          setNotFound(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (portfolio) {
      document.title = `${portfolio.name} — Portfolio`;
    }
  }, [portfolio]);

  if (loading) {
    return (
      <div className={styles.statusWrapper}>
        <p className={styles.statusText}>Loading...</p>
      </div>
    );
  }

  if (notFound || !portfolio) {
    return (
      <div className={styles.statusWrapper}>
        <p className={styles.statusText}>Portfolio not found</p>
        <Link href="/" className={styles.statusLink}>
          Go back home
        </Link>
      </div>
    );
  }

  const initials = getInitials(portfolio.name);
  const social = portfolio.socialLinks || {};
  const hasSocial = Boolean(social.linkedin || social.naukri || social.github || social.website);

  return (
    <div className={styles.page}>
      <div
        className={styles.cover}
        style={
          portfolio.backgroundImageUrl
            ? {
                backgroundImage: `url(${portfolio.backgroundImageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : {
                background: "linear-gradient(135deg, var(--brand), var(--brand-dark))",
              }
        }
      >
        <div className={styles.coverOverlay} />
      </div>

      <div className={styles.container}>
        <div className={styles.profileRow}>
          {portfolio.profilePictureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={portfolio.profilePictureUrl} alt={portfolio.name} className={styles.profilePicture} />
          ) : (
            <div className={styles.profilePlaceholder}>{initials}</div>
          )}
        </div>

        <h1 className={styles.name}>{portfolio.name}</h1>
        {portfolio.headline && <p className={styles.headline}>{portfolio.headline}</p>}

        {(portfolio.location || portfolio.phone) && (
          <div className={styles.metaRow}>
            {portfolio.location && (
              <span className={styles.metaItem}>
                <LocationIcon />
                {portfolio.location}
              </span>
            )}
            {portfolio.phone && (
              <span className={styles.metaItem}>
                <PhoneIcon />
                {portfolio.phone}
              </span>
            )}
          </div>
        )}

        {hasSocial && (
          <div className={styles.socialRow}>
            {social.linkedin && (
              <a href={social.linkedin} target="_blank" rel="noopener noreferrer" className={styles.socialPill}>
                <LinkedInIcon />
                LinkedIn
              </a>
            )}
            {social.naukri && (
              <a href={social.naukri} target="_blank" rel="noopener noreferrer" className={styles.socialPill}>
                <NaukriIcon />
                Naukri
              </a>
            )}
            {social.github && (
              <a href={social.github} target="_blank" rel="noopener noreferrer" className={styles.socialPill}>
                <GitHubIcon />
                GitHub
              </a>
            )}
            {social.website && (
              <a href={social.website} target="_blank" rel="noopener noreferrer" className={styles.socialPill}>
                <WebsiteIcon />
                Website
              </a>
            )}
          </div>
        )}

        {portfolio.bio && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>About</h2>
            <p className={styles.bioText}>{portfolio.bio}</p>
          </section>
        )}

        {portfolio.skills && portfolio.skills.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Skills</h2>
            <div className={styles.pillGroup}>
              {portfolio.skills.map((skill, idx) => (
                <span key={`${skill}-${idx}`} className={styles.skillPill}>
                  {skill}
                </span>
              ))}
            </div>
          </section>
        )}

        {portfolio.experience && portfolio.experience.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Experience</h2>
            <div className={styles.timeline}>
              {portfolio.experience.map((exp, idx) => (
                <div key={idx} className={styles.timelineItem}>
                  <span className={styles.timelineDot} />
                  <div className={styles.timelineContent}>
                    <p className={styles.timelineTitle}>
                      {exp.role} <span className={styles.timelineAt}>at</span> {exp.company}
                    </p>
                    <p className={styles.timelineDate}>{formatExpRange(exp.startDate, exp.endDate, exp.current)}</p>
                    {exp.description && <p className={styles.timelineDescription}>{exp.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {portfolio.education && portfolio.education.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Education</h2>
            <div className={styles.timeline}>
              {portfolio.education.map((edu, idx) => (
                <div key={idx} className={styles.timelineItem}>
                  <span className={styles.timelineDot} />
                  <div className={styles.timelineContent}>
                    <p className={styles.timelineTitle}>
                      {edu.degree}
                      {edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ""}
                    </p>
                    <p className={styles.timelineAt}>{edu.institution}</p>
                    <p className={styles.timelineDate}>{formatEduRange(edu.startYear, edu.endYear)}</p>
                    {edu.grade && <p className={styles.timelineGrade}>{edu.grade}</p>}
                    {edu.description && <p className={styles.timelineDescription}>{edu.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {portfolio.projects && portfolio.projects.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Projects</h2>
            <div className={styles.projectGrid}>
              {portfolio.projects.map((project, idx) => (
                <div key={idx} className={styles.projectCard}>
                  <p className={styles.projectTitle}>{project.title}</p>
                  {project.description && <p className={styles.projectDescription}>{project.description}</p>}
                  {project.techStack && project.techStack.length > 0 && (
                    <div className={styles.pillGroup}>
                      {project.techStack.map((tech, techIdx) => (
                        <span key={`${tech}-${techIdx}`} className={styles.skillPill}>
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                  {(project.link || project.github) && (
                    <div className={styles.projectLinks}>
                      {project.link && (
                        <a href={project.link} target="_blank" rel="noopener noreferrer" className={styles.projectLink}>
                          Live demo →
                        </a>
                      )}
                      {project.github && (
                        <a href={project.github} target="_blank" rel="noopener noreferrer" className={styles.projectLink}>
                          View code →
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {portfolio.achievements && portfolio.achievements.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Achievements</h2>
            <div className={styles.achievementList}>
              {portfolio.achievements.map((achievement, idx) => (
                <div key={idx} className={styles.achievementItem}>
                  <div className={styles.achievementHeader}>
                    <p className={styles.achievementTitle}>{achievement.title}</p>
                    {achievement.date && <span className={styles.achievementDate}>{achievement.date}</span>}
                  </div>
                  {achievement.description && <p className={styles.achievementDescription}>{achievement.description}</p>}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <footer className={styles.footer}>
        <p>
          Built with <Link href="/">InstituteSathi</Link>
        </p>
      </footer>
    </div>
  );
}
