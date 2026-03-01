import { Star, X, Link2, Check } from 'lucide-react';
import { useState } from 'react';
import { useAppStore } from '../store';
import { submitFeedback } from '../services';

export default function FeedbackPopup() {
  const analysisData = useAppStore((s) => s.analysisData);
  const feedbackDismissedFor = useAppStore((s) => s.feedbackDismissedFor);
  const setFeedbackDismissed = useAppStore((s) => s.setFeedbackDismissed);

  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const reportName = analysisData?.projectSummary?.uploadedFileName;

  // Don't show if no analysis or already dismissed for this report
  if (!analysisData || !reportName) return null;
  if (feedbackDismissedFor === reportName) return null;

  const handleDismiss = () => {
    setFeedbackDismissed(reportName);
  };

  const handleSubmit = async () => {
    try {
      await submitFeedback({
        rating: rating || undefined,
        comment: comment.trim() || undefined,
        email: email.trim() || undefined,
        reportName,
      });
    } catch {
      // Silently fail — non-critical
    }
    setSubmitted(true);
    setTimeout(() => {
      handleDismiss();
    }, 2000);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Fallback — ignore
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4 animate-slide-up">
      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl shadow-2xl p-5">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
        >
          <X size={16} />
        </button>

        {submitted ? (
          <div className="text-center py-2">
            <Check
              size={32}
              className="mx-auto mb-2 text-[var(--success-color)]"
            />
            <p className="text-sm font-medium text-[var(--success-color)]">
              Thanks for your feedback!
            </p>
          </div>
        ) : (
          <>
            <h3
              className="text-sm font-bold text-[var(--text-primary)] mb-3"
              style={{ fontFamily: 'var(--font-oswald)' }}
            >
              How was your experience?
            </h3>

            {/* Star rating */}
            <div className="flex gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  className="transition-colors"
                >
                  <Star
                    size={24}
                    className={
                      star <= (hoveredStar || rating)
                        ? 'fill-[var(--warning-color)] text-[var(--warning-color)]'
                        : 'text-[var(--text-muted)]'
                    }
                  />
                </button>
              ))}
            </div>

            {/* Comment */}
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What could be better?"
              className="w-full px-3 py-2 mb-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-color)]"
            />

            {/* Email */}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Want early access? Enter your email"
              className="w-full px-3 py-2 mb-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-color)]"
            />

            {/* Submit */}
            <button
              onClick={handleSubmit}
              className="w-full py-2 bg-[var(--accent-color)] text-white rounded-lg text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors mb-3"
              style={{ fontFamily: 'var(--font-oswald)' }}
            >
              Submit Feedback
            </button>

            {/* Share CTA */}
            <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between">
              <p className="text-xs text-[var(--text-muted)]">
                Know someone who'd find this useful?
              </p>
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-[var(--accent-color)] hover:bg-[var(--accent-color)]/10 transition-colors"
              >
                {linkCopied ? (
                  <>
                    <Check size={12} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Link2 size={12} />
                    Copy Link
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
