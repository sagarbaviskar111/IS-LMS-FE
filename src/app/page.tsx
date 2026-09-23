import LandingNav from "./LandingNav";
import LandingHero from "./LandingHero";
import LandingServices from "./LandingServices";
import LandingShowcase from "./LandingShowcase";
import LandingTestimonials from "./LandingTestimonials";
import styles from "./landing.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <LandingNav />
      <LandingHero />
      <LandingServices />
      <LandingShowcase />
      <LandingTestimonials />
    </div>
  );
}
