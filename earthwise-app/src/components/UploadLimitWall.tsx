import { Lock, Mail, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { submitWaitlist } from '../services';

export default function UploadLimitWall() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSubmitting(true);
    try {
      await submitWaitlist(email.trim(), 'limit_reached');
      setSubmitted(true);
    } catch {
      // Silently fail — non-critical
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="rounded-xl p-8 text-center bg-gradient-to-br from-[var(--accent-color)]/10 to-[var(--accent-color)]/5 border border-[var(--accent-color)]/20">
        <Lock size={40} className="mx-auto mb-4 text-[var(--accent-color)]" />
        <h3
          className="text-xl font-bold text-[var(--text-primary)] mb-2"
          style={{ fontFamily: 'var(--font-oswald)' }}
        >
          You've Reached the Free Limit
        </h3>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          You've used all 5 free analyses. Join the waitlist for unlimited access when we launch.
        </p>

        {submitted ? (
          <div className="px-4 py-3 rounded-lg bg-[var(--success-color)]/10 border border-[var(--success-color)]/30">
            <p className="text-sm text-[var(--success-color)] font-medium">
              You're on the list! We'll be in touch soon.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-2 max-w-sm mx-auto">
            <div className="relative flex-1">
              <Mail
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2.5 bg-[var(--accent-color)] text-white rounded-lg text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              Join Waitlist
              <ArrowRight size={14} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
