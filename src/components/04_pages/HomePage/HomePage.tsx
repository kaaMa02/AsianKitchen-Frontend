import AboutSection from "../../03_organisms/Home/AboutSection";
import ContactInfoSection from "../../03_organisms/Home/ContactInfoSection";
import HeroSection from "../../03_organisms/Home/HeroSection";
import MapSection from "../../03_organisms/Home/Location";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <AboutSection />
      <MapSection />
      <ContactInfoSection />
    </>
  );
}
