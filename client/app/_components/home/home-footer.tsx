import Link from "next/link";
import { Github, Linkedin, Shield, Twitter } from "lucide-react";
import { ROUTES } from "@/config/routes";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Marketplace", href: ROUTES.MARKETPLACE },
      { label: "Features", href: "#features" },
      { label: "How it works", href: "#how-it-works" },
      { label: "For owners", href: "#roles" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Log in", href: ROUTES.LOGIN },
      { label: "Create account", href: ROUTES.REGISTER },
      { label: "Profile", href: ROUTES.PROFILE },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "#" },
      { label: "Support", href: "#" },
      { label: "Status", href: "#" },
      { label: "Contact", href: "#" },
    ],
  },
] as const;

export function HomeFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="container py-14">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <Link href={ROUTES.HOME} className="inline-flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Shield className="h-5 w-5" />
              </span>
              <span className="font-serif text-lg font-semibold tracking-tight">
                Land<span className="text-primary">Chain</span>
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              Blockchain-backed land registry — owners list, buyers verify,
              admins moderate, the chain remembers.
            </p>
            <div className="mt-5 flex gap-2">
              {[
                { href: "#", label: "Twitter", icon: Twitter },
                { href: "#", label: "GitHub", icon: Github },
                { href: "#", label: "LinkedIn", icon: Linkedin },
              ].map(({ href, label, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input text-muted-foreground transition-colors duration-hover hover:bg-brand-100 hover:text-brand-900"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {columns.map((col) => (
              <div key={col.title}>
                <h4 className="text-sm font-semibold text-foreground">
                  {col.title}
                </h4>
                <ul className="mt-3 space-y-2">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors duration-hover hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} LandChain. Built as a final-year project.</p>
          <div className="flex gap-4">
            <a href="#" className="transition-colors duration-hover hover:text-foreground">
              Privacy
            </a>
            <a href="#" className="transition-colors duration-hover hover:text-foreground">
              Terms
            </a>
            <a href="#" className="transition-colors duration-hover hover:text-foreground">
              Security
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
