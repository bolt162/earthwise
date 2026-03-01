import { Mail, ArrowRight, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { submitWaitlist } from '../../services';

export default function WaitlistSection() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSubmitting(true);
    try {
      await submitWaitlist(email.trim(), 'landing_page');
      setSubmitted(true);
    } catch {
      // Silently fail — non-critical
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="waitlist" className="py-20 landing-waitlist-bg">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <h2
          className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4"
          style={{ fontFamily: 'var(--font-oswald)' }}
        >
          Get Early Access to Unlimited Analysis
        </h2>
        <p className="text-[var(--text-secondary)] mb-8 max-w-lg mx-auto">
          Join the waitlist for priority access when we launch premium features
          including unlimited uploads, team collaboration, and API access.
        </p>

        {submitted ? (
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--success-color)]/10 border border-[var(--success-color)]/30">
            <CheckCircle size={20} className="text-[var(--success-color)]" />
            <span className="text-[var(--success-color)] font-medium">
              You're on the list! We'll be in touch soon.
            </span>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
          >
            <div className="relative flex-1">
              <Mail
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--card-bg)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 bg-[var(--accent-color)] text-white rounded-xl font-semibold text-sm hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ fontFamily: 'var(--font-oswald)' }}
            >
              Join the Waitlist
              <ArrowRight size={16} />
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
