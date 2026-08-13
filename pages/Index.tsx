import { ArrowRight, CalendarDays, HeartPulse, ShieldCheck, Stethoscope } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Index() {
  const navigate = useNavigate();

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#10180f] px-6 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(126,153,79,0.20),transparent_38%),linear-gradient(135deg,#10180f_0%,#182217_55%,#0b120c_100%)]" />
      <div className="digital-grid absolute inset-0 opacity-25" />
      <div className="absolute left-[12%] top-[18%] h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="absolute bottom-[12%] right-[10%] h-56 w-56 rounded-full bg-lime-500/10 blur-3xl" />

      <section className="relative z-10 flex max-w-3xl flex-col items-center text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-lime-100/80 backdrop-blur">
          <ShieldCheck className="h-4 w-4 text-[#a7bf75]" />
          Africa's healthcare professional network
        </div>

        <div className="medical-logo-stage" aria-label="Medical Events Connect logo">
          <div className="medical-logo-orbit medical-logo-orbit-one" />
          <div className="medical-logo-orbit medical-logo-orbit-two" />
          <div className="medical-logo-rotator">
            <CalendarDays className="absolute h-20 w-20 text-[#a7bf75]/45" strokeWidth={1.25} />
            <HeartPulse className="h-24 w-24 text-white drop-shadow-[0_0_22px_rgba(167,191,117,0.65)]" strokeWidth={1.45} />
            <Stethoscope className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full bg-[#6f8745] p-2 text-white shadow-xl" />
          </div>
        </div>

        <p className="mt-8 text-xs font-bold uppercase tracking-[0.3em] text-[#a7bf75]">Medical Events Connect · Africa</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-black tracking-tight sm:text-6xl">
          Connect. Learn. Advance African Healthcare.
        </h1>
        <p className="mt-5 max-w-xl text-sm leading-7 text-white/65 sm:text-base">
          Discover medical events, meet verified practitioners, share professional knowledge and manage your CPD resources in one secure platform.
        </p>

        <button
          type="button"
          onClick={() => navigate("/login")}
          className="group mt-9 inline-flex items-center gap-3 rounded-full bg-[#78934b] px-8 py-4 text-sm font-bold uppercase tracking-[0.12em] text-white shadow-[0_12px_40px_rgba(92,122,55,0.35)] transition hover:-translate-y-1 hover:bg-[#89a756] focus:outline-none focus:ring-4 focus:ring-[#a7bf75]/30"
        >
          Get Started
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </button>
      </section>
    </main>
  );
}
