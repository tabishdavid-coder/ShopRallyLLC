/** Demo Google reviews for mock mode (shared by seed + mock provider). */

export type MockGoogleReview = {
  googleReviewId: string;
  reviewerName: string;
  starRating: number;
  comment: string | null;
  reviewReply: string | null;
  googleCreatedAt: Date;
};

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export const MOCK_GOOGLE_REVIEWS: MockGoogleReview[] = [
  {
    googleReviewId: "mock-review-1",
    reviewerName: "Sarah M.",
    starRating: 5,
    comment:
      "Best shop in Schenectady! They fixed my brakes same day and explained everything clearly. Will definitely be back.",
    reviewReply:
      "Thank you Sarah! We appreciate your trust in In & Out AutoHaus — see you next time.",
    googleCreatedAt: daysAgo(4),
  },
  {
    googleReviewId: "mock-review-2",
    reviewerName: "Mike T.",
    starRating: 4,
    comment: "Good service overall. Wait time was a bit longer than expected but the work quality was solid.",
    reviewReply: null,
    googleCreatedAt: daysAgo(9),
  },
  {
    googleReviewId: "mock-review-3",
    reviewerName: "Jennifer L.",
    starRating: 5,
    comment: "Honest pricing and friendly staff. They didn't try to upsell me on things I didn't need.",
    reviewReply: "Thanks Jennifer — transparency is what we're about!",
    googleCreatedAt: daysAgo(14),
  },
  {
    googleReviewId: "mock-review-4",
    reviewerName: "Robert K.",
    starRating: 2,
    comment: "Took longer than quoted and I had to call twice for an update on my vehicle status.",
    reviewReply: null,
    googleCreatedAt: daysAgo(21),
  },
  {
    googleReviewId: "mock-review-5",
    reviewerName: "Amanda P.",
    starRating: 5,
    comment: "Fast oil change and they found a small leak before it became a big problem. Highly recommend!",
    reviewReply: null,
    googleCreatedAt: daysAgo(28),
  },
];
