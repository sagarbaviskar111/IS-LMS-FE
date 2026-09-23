"use client";

import { useState } from "react";
import {
  PortfolioAchievement,
  PortfolioEducation,
  PortfolioExperience,
  PortfolioOwn,
  PortfolioProject,
  PortfolioSocialLinks,
  PortfolioUpdatePayload,
} from "@/lib/api";
import styles from "./PortfolioForm.module.css";

// Local "draft" shapes used while editing repeatable list sections. Optional
// API fields are kept as plain strings here (never undefined) so inputs stay
// controlled; they're converted back to the API shape on submit.
interface EducationDraft {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startYear: string;
  endYear: string;
  grade: string;
  description: string;
}

interface ExperienceDraft {
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}

interface ProjectDraft {
  title: string;
  description: string;
  techStackText: string;
  link: string;
  github: string;
}

interface AchievementDraft {
  title: string;
  description: string;
  date: string;
}

const emptyEducation: EducationDraft = {
  institution: "",
  degree: "",
  fieldOfStudy: "",
  startYear: "",
  endYear: "",
  grade: "",
  description: "",
};

const emptyExperience: ExperienceDraft = {
  company: "",
  role: "",
  startDate: "",
  endDate: "",
  current: false,
  description: "",
};

const emptyProject: ProjectDraft = {
  title: "",
  description: "",
  techStackText: "",
  link: "",
  github: "",
};

const emptyAchievement: AchievementDraft = {
  title: "",
  description: "",
  date: "",
};

function toEducationDraft(e: PortfolioEducation): EducationDraft {
  return {
    institution: e.institution ?? "",
    degree: e.degree ?? "",
    fieldOfStudy: e.fieldOfStudy ?? "",
    startYear: e.startYear ?? "",
    endYear: e.endYear ?? "",
    grade: e.grade ?? "",
    description: e.description ?? "",
  };
}

function fromEducationDraft(d: EducationDraft): PortfolioEducation {
  return {
    institution: d.institution,
    degree: d.degree,
    fieldOfStudy: d.fieldOfStudy.trim() || undefined,
    startYear: d.startYear.trim() || undefined,
    endYear: d.endYear.trim() || undefined,
    grade: d.grade.trim() || undefined,
    description: d.description.trim() || undefined,
  };
}

function toExperienceDraft(e: PortfolioExperience): ExperienceDraft {
  return {
    company: e.company ?? "",
    role: e.role ?? "",
    startDate: e.startDate ?? "",
    endDate: e.endDate ?? "",
    current: e.current ?? false,
    description: e.description ?? "",
  };
}

function fromExperienceDraft(d: ExperienceDraft): PortfolioExperience {
  return {
    company: d.company,
    role: d.role,
    startDate: d.startDate.trim() || undefined,
    endDate: d.current ? undefined : d.endDate.trim() || undefined,
    current: d.current,
    description: d.description.trim() || undefined,
  };
}

function toProjectDraft(p: PortfolioProject): ProjectDraft {
  return {
    title: p.title ?? "",
    description: p.description ?? "",
    techStackText: (p.techStack ?? []).join(", "),
    link: p.link ?? "",
    github: p.github ?? "",
  };
}

function fromProjectDraft(d: ProjectDraft): PortfolioProject {
  return {
    title: d.title,
    description: d.description.trim() || undefined,
    techStack: d.techStackText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    link: d.link.trim() || undefined,
    github: d.github.trim() || undefined,
  };
}

function toAchievementDraft(a: PortfolioAchievement): AchievementDraft {
  return {
    title: a.title ?? "",
    description: a.description ?? "",
    date: a.date ?? "",
  };
}

function fromAchievementDraft(d: AchievementDraft): PortfolioAchievement {
  return {
    title: d.title,
    description: d.description.trim() || undefined,
    date: d.date.trim() || undefined,
  };
}

// Small generic helpers shared by every repeatable-list section below, so
// education/experience/projects/achievements don't each hand-roll their own
// add/remove/update logic.
function addListItem<T>(setList: React.Dispatch<React.SetStateAction<T[]>>, empty: T) {
  setList((prev) => [...prev, empty]);
}

function removeListItem<T>(setList: React.Dispatch<React.SetStateAction<T[]>>, index: number) {
  setList((prev) => prev.filter((_, i) => i !== index));
}

function updateListItem<T, K extends keyof T>(
  setList: React.Dispatch<React.SetStateAction<T[]>>,
  index: number,
  field: K,
  value: T[K]
) {
  setList((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
}

export interface PortfolioFormProps {
  mode: "create" | "edit";
  initial?: PortfolioOwn;
  onSubmitCreate?: (payload: {
    name: string;
    email: string;
    password: string;
    dob: string;
    headline?: string;
    bio?: string;
    phone?: string;
    location?: string;
  }) => Promise<void>;
  onSubmitUpdate?: (payload: PortfolioUpdatePayload) => Promise<void>;
  submitting: boolean;
  error?: string;
}

export default function PortfolioForm({
  mode,
  initial,
  onSubmitCreate,
  onSubmitUpdate,
  submitting,
  error,
}: PortfolioFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dob, setDob] = useState("");
  const [headline, setHeadline] = useState(initial?.headline ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");

  const [linkedin, setLinkedin] = useState(initial?.socialLinks?.linkedin ?? "");
  const [naukri, setNaukri] = useState(initial?.socialLinks?.naukri ?? "");
  const [githubUrl, setGithubUrl] = useState(initial?.socialLinks?.github ?? "");
  const [website, setWebsite] = useState(initial?.socialLinks?.website ?? "");

  const [education, setEducation] = useState<EducationDraft[]>(
    (initial?.education ?? []).map(toEducationDraft)
  );
  const [experience, setExperience] = useState<ExperienceDraft[]>(
    (initial?.experience ?? []).map(toExperienceDraft)
  );
  const [projects, setProjects] = useState<ProjectDraft[]>(
    (initial?.projects ?? []).map(toProjectDraft)
  );
  const [skillsText, setSkillsText] = useState((initial?.skills ?? []).join(", "));
  const [achievements, setAchievements] = useState<AchievementDraft[]>(
    (initial?.achievements ?? []).map(toAchievementDraft)
  );

  const isEdit = mode === "edit";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "create") {
      if (!onSubmitCreate) return;
      await onSubmitCreate({
        name,
        email,
        password,
        dob,
        headline: headline.trim() || undefined,
        bio: bio.trim() || undefined,
        phone: phone.trim() || undefined,
        location: location.trim() || undefined,
      });
      return;
    }

    if (!onSubmitUpdate) return;
    const socialLinks: PortfolioSocialLinks = {
      linkedin: linkedin.trim() || undefined,
      naukri: naukri.trim() || undefined,
      github: githubUrl.trim() || undefined,
      website: website.trim() || undefined,
    };
    await onSubmitUpdate({
      name: name.trim() || undefined,
      headline: headline.trim() || undefined,
      bio: bio.trim() || undefined,
      phone: phone.trim() || undefined,
      location: location.trim() || undefined,
      socialLinks,
      education: education.map(fromEducationDraft),
      experience: experience.map(fromExperienceDraft),
      projects: projects.map(fromProjectDraft),
      skills: skillsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      achievements: achievements.map(fromAchievementDraft),
    });
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Account &amp; basic details</h2>

        <div className={styles.grid}>
          <label className={styles.label}>
            Name
            <input
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>

          {!isEdit && (
            <label className={styles.label}>
              Email
              <input
                className={styles.input}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
          )}

          {!isEdit && (
            <label className={styles.label}>
              Password
              <input
                className={styles.input}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </label>
          )}

          {!isEdit && (
            <label className={styles.label}>
              Date of birth
              <input
                className={styles.input}
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                required
              />
            </label>
          )}

          <label className={styles.label}>
            Headline
            <input
              className={styles.input}
              placeholder="e.g. Aspiring Full Stack Developer"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
            />
          </label>

          <label className={styles.label}>
            Phone
            <input
              className={styles.input}
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>

          <label className={styles.label}>
            Location
            <input
              className={styles.input}
              placeholder="City, Country"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </label>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>About</h2>
        <label className={styles.label}>
          Bio
          <textarea
            className={styles.textarea}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell visitors a bit about yourself..."
          />
        </label>
      </div>

      {!isEdit && (
        <p className={styles.sectionHint}>
          You&apos;ll be able to add links, education, experience, projects, skills and
          achievements right after creating your account.
        </p>
      )}

      {isEdit && (
        <>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Social &amp; professional links</h2>
            <div className={styles.grid}>
              <label className={styles.label}>
                LinkedIn
                <input
                  className={styles.input}
                  type="url"
                  placeholder="https://linkedin.com/in/..."
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                />
              </label>
              <label className={styles.label}>
                Naukri.com
                <input
                  className={styles.input}
                  type="url"
                  placeholder="https://naukri.com/..."
                  value={naukri}
                  onChange={(e) => setNaukri(e.target.value)}
                />
              </label>
              <label className={styles.label}>
                GitHub
                <input
                  className={styles.input}
                  type="url"
                  placeholder="https://github.com/..."
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                />
              </label>
              <label className={styles.label}>
                Website / portfolio
                <input
                  className={styles.input}
                  type="url"
                  placeholder="https://..."
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </label>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Education</h2>
            <div className={styles.itemList}>
              {education.map((item, index) => (
                <div className={styles.itemCard} key={index}>
                  <div className={styles.itemHeader}>
                    <span className={styles.itemNumber}>Education {index + 1}</span>
                    <button
                      type="button"
                      className={styles.removeButton}
                      onClick={() => removeListItem(setEducation, index)}
                    >
                      Remove
                    </button>
                  </div>
                  <div className={styles.grid}>
                    <label className={styles.label}>
                      Institution
                      <input
                        className={styles.input}
                        value={item.institution}
                        onChange={(e) =>
                          updateListItem(setEducation, index, "institution", e.target.value)
                        }
                        required
                      />
                    </label>
                    <label className={styles.label}>
                      Degree
                      <input
                        className={styles.input}
                        value={item.degree}
                        onChange={(e) =>
                          updateListItem(setEducation, index, "degree", e.target.value)
                        }
                        required
                      />
                    </label>
                    <label className={styles.label}>
                      Field of study
                      <input
                        className={styles.input}
                        value={item.fieldOfStudy}
                        onChange={(e) =>
                          updateListItem(setEducation, index, "fieldOfStudy", e.target.value)
                        }
                      />
                    </label>
                    <label className={styles.label}>
                      Grade
                      <input
                        className={styles.input}
                        value={item.grade}
                        onChange={(e) =>
                          updateListItem(setEducation, index, "grade", e.target.value)
                        }
                      />
                    </label>
                    <label className={styles.label}>
                      Start year
                      <input
                        className={styles.input}
                        placeholder="e.g. 2021"
                        value={item.startYear}
                        onChange={(e) =>
                          updateListItem(setEducation, index, "startYear", e.target.value)
                        }
                      />
                    </label>
                    <label className={styles.label}>
                      End year
                      <input
                        className={styles.input}
                        placeholder="e.g. 2025"
                        value={item.endYear}
                        onChange={(e) =>
                          updateListItem(setEducation, index, "endYear", e.target.value)
                        }
                      />
                    </label>
                  </div>
                  <label className={styles.label}>
                    Description
                    <textarea
                      className={styles.textarea}
                      value={item.description}
                      onChange={(e) =>
                        updateListItem(setEducation, index, "description", e.target.value)
                      }
                    />
                  </label>
                </div>
              ))}
              <button
                type="button"
                className={styles.addButton}
                onClick={() => addListItem(setEducation, emptyEducation)}
              >
                + Add education
              </button>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Experience</h2>
            <div className={styles.itemList}>
              {experience.map((item, index) => (
                <div className={styles.itemCard} key={index}>
                  <div className={styles.itemHeader}>
                    <span className={styles.itemNumber}>Experience {index + 1}</span>
                    <button
                      type="button"
                      className={styles.removeButton}
                      onClick={() => removeListItem(setExperience, index)}
                    >
                      Remove
                    </button>
                  </div>
                  <div className={styles.grid}>
                    <label className={styles.label}>
                      Company
                      <input
                        className={styles.input}
                        value={item.company}
                        onChange={(e) =>
                          updateListItem(setExperience, index, "company", e.target.value)
                        }
                        required
                      />
                    </label>
                    <label className={styles.label}>
                      Role
                      <input
                        className={styles.input}
                        value={item.role}
                        onChange={(e) =>
                          updateListItem(setExperience, index, "role", e.target.value)
                        }
                        required
                      />
                    </label>
                    <label className={styles.label}>
                      Start date
                      <input
                        className={styles.input}
                        placeholder="e.g. Jun 2024"
                        value={item.startDate}
                        onChange={(e) =>
                          updateListItem(setExperience, index, "startDate", e.target.value)
                        }
                      />
                    </label>
                    <label className={styles.label}>
                      End date
                      <input
                        className={styles.input}
                        placeholder="e.g. Aug 2024"
                        value={item.endDate}
                        disabled={item.current}
                        onChange={(e) =>
                          updateListItem(setExperience, index, "endDate", e.target.value)
                        }
                      />
                    </label>
                  </div>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={item.current}
                      onChange={(e) =>
                        updateListItem(setExperience, index, "current", e.target.checked)
                      }
                    />
                    I currently work here
                  </label>
                  <label className={styles.label}>
                    Description
                    <textarea
                      className={styles.textarea}
                      value={item.description}
                      onChange={(e) =>
                        updateListItem(setExperience, index, "description", e.target.value)
                      }
                    />
                  </label>
                </div>
              ))}
              <button
                type="button"
                className={styles.addButton}
                onClick={() => addListItem(setExperience, emptyExperience)}
              >
                + Add experience
              </button>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Projects</h2>
            <div className={styles.itemList}>
              {projects.map((item, index) => (
                <div className={styles.itemCard} key={index}>
                  <div className={styles.itemHeader}>
                    <span className={styles.itemNumber}>Project {index + 1}</span>
                    <button
                      type="button"
                      className={styles.removeButton}
                      onClick={() => removeListItem(setProjects, index)}
                    >
                      Remove
                    </button>
                  </div>
                  <label className={styles.label}>
                    Title
                    <input
                      className={styles.input}
                      value={item.title}
                      onChange={(e) => updateListItem(setProjects, index, "title", e.target.value)}
                      required
                    />
                  </label>
                  <label className={styles.label}>
                    Description
                    <textarea
                      className={styles.textarea}
                      value={item.description}
                      onChange={(e) =>
                        updateListItem(setProjects, index, "description", e.target.value)
                      }
                    />
                  </label>
                  <label className={styles.label}>
                    Tech stack (comma separated)
                    <input
                      className={styles.input}
                      placeholder="React, Node.js, MongoDB"
                      value={item.techStackText}
                      onChange={(e) =>
                        updateListItem(setProjects, index, "techStackText", e.target.value)
                      }
                    />
                  </label>
                  <div className={styles.grid}>
                    <label className={styles.label}>
                      Live link
                      <input
                        className={styles.input}
                        type="url"
                        value={item.link}
                        onChange={(e) => updateListItem(setProjects, index, "link", e.target.value)}
                      />
                    </label>
                    <label className={styles.label}>
                      GitHub
                      <input
                        className={styles.input}
                        type="url"
                        value={item.github}
                        onChange={(e) =>
                          updateListItem(setProjects, index, "github", e.target.value)
                        }
                      />
                    </label>
                  </div>
                </div>
              ))}
              <button
                type="button"
                className={styles.addButton}
                onClick={() => addListItem(setProjects, emptyProject)}
              >
                + Add project
              </button>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Skills</h2>
            <label className={styles.label}>
              Skills (comma separated)
              <input
                className={styles.input}
                placeholder="JavaScript, React, SQL"
                value={skillsText}
                onChange={(e) => setSkillsText(e.target.value)}
              />
            </label>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Achievements</h2>
            <div className={styles.itemList}>
              {achievements.map((item, index) => (
                <div className={styles.itemCard} key={index}>
                  <div className={styles.itemHeader}>
                    <span className={styles.itemNumber}>Achievement {index + 1}</span>
                    <button
                      type="button"
                      className={styles.removeButton}
                      onClick={() => removeListItem(setAchievements, index)}
                    >
                      Remove
                    </button>
                  </div>
                  <label className={styles.label}>
                    Title
                    <input
                      className={styles.input}
                      value={item.title}
                      onChange={(e) =>
                        updateListItem(setAchievements, index, "title", e.target.value)
                      }
                      required
                    />
                  </label>
                  <label className={styles.label}>
                    Description
                    <textarea
                      className={styles.textarea}
                      value={item.description}
                      onChange={(e) =>
                        updateListItem(setAchievements, index, "description", e.target.value)
                      }
                    />
                  </label>
                  <label className={styles.label}>
                    Date
                    <input
                      className={styles.input}
                      placeholder="e.g. 2024"
                      value={item.date}
                      onChange={(e) =>
                        updateListItem(setAchievements, index, "date", e.target.value)
                      }
                    />
                  </label>
                </div>
              ))}
              <button
                type="button"
                className={styles.addButton}
                onClick={() => addListItem(setAchievements, emptyAchievement)}
              >
                + Add achievement
              </button>
            </div>
          </div>
        </>
      )}

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.footer}>
        <button className={styles.submitButton} type="submit" disabled={submitting}>
          {submitting
            ? isEdit
              ? "Saving..."
              : "Creating..."
            : isEdit
              ? "Save changes"
              : "Create my portfolio"}
        </button>
      </div>
    </form>
  );
}
