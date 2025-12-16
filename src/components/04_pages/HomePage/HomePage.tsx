import AboutSection from "../../03_organisms/Home/AboutSection";
import ContactInfoSection from "../../03_organisms/Home/ContactInfoSection";
import HeroSection from "../../03_organisms/Home/HeroSection";
import MapSection from "../../03_organisms/Home/Location";
import { Helmet } from "react-helmet-async";
import { GF_ORDER_URL } from "../../../config/gloriafood"; // adjust path

export default function HomePage() {
  return (
    <>
      <Helmet>
        <title>Asian Kitchen – Trimbach</title>
        <meta
          name="description"
          content="Asian Kitchen in Trimbach: Sushi, Thai & mehr. Online bestellen (Take-away & Lieferung) und Tisch reservieren."
        />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Restaurant",
            name: "Asian Kitchen",
            address: {
              "@type": "PostalAddress",
              streetAddress: "Baslerstrasse 16",
              postalCode: "4632",
              addressLocality: "Trimbach",
              addressCountry: "CH",
            },
            servesCuisine: ["Sushi", "Thai", "Asian"],
            menu: GF_ORDER_URL,
          })}
        </script>
      </Helmet>

      <HeroSection />
      <AboutSection />
      <MapSection />
      <ContactInfoSection />
    </>
  );
}
