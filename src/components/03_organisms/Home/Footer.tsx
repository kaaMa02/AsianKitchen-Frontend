import { useRestaurantInfoCtx } from "../../../contexts/RestaurantInfoContext";

export default function Footer() {
  const { info } = useRestaurantInfoCtx();
  const name = info?.name ?? 'Asian Kitchen';
  return (
    <footer className="bg-[#0B2D24] py-16">
      <div className="mx-auto max-w-[1200px] px-6 md:px-10 flex items-center justify-between text-[#EFE7CE]">
        <span>© {new Date().getFullYear()} {name}</span>
        <a href="/privacy" className="underline">PRIVACY</a>
      </div>
    </footer>
  );
}