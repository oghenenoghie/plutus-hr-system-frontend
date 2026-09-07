"use client";

import { use, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ErrorState, LoadingState } from "@/components/ui/data-state";
import { Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { employeesApi, performanceReviewsApi } from "@/lib/api/endpoints";
import { formatDate } from "@/lib/format";
import { useApiResource } from "@/lib/hooks";

const RATINGS = [1, 2, 3, 4, 5];

export default function PerformanceReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { showToast } = useToast();
  const review = useApiResource(() => performanceReviewsApi.get(id), [id]);
  const employees = useApiResource(() => employeesApi.list());
  const employeesById = new Map((employees.data ?? []).map((employee) => [employee.id, employee]));
  const [rating, setRating] = useState("");
  const [managerComments, setManagerComments] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitReview(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await performanceReviewsApi.submit(id, {
        rating: rating ? Number(rating) : null,
        manager_comments: managerComments || null,
      });
      showToast("Review submitted", "good");
      review.reload();
    } catch (err) {
      showToast(err instanceof ApiError ? String(err.detail ?? err.message) : "Action failed.", "bad");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {review.loading ? <LoadingState /> : null}
      {review.error ? <ErrorState message={review.error} /> : null}
      {review.data ? (
        <>
          <PageHeader
            title={employeesById.get(review.data.employee_id)?.full_name ?? "Performance Review"}
            subtitle={`${formatDate(review.data.period_start)} – ${formatDate(review.data.period_end)}`}
          />

          <Card className="mb-6">
            <div className="flex items-center gap-3">
              <StatusBadge status={review.data.status} />
              {review.data.rating != null ? (
                <span className="text-[12px] text-ink-soft">Rating: {review.data.rating}/5</span>
              ) : null}
            </div>
            {review.data.goals ? (
              <div className="mt-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft">
                  Goals
                </div>
                <p className="mt-1 whitespace-pre-wrap text-[13px] text-ink-soft">{review.data.goals}</p>
              </div>
            ) : null}
            {review.data.manager_comments ? (
              <div className="mt-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft">
                  Manager Comments
                </div>
                <p className="mt-1 whitespace-pre-wrap text-[13px] text-ink-soft">
                  {review.data.manager_comments}
                </p>
              </div>
            ) : null}
            {review.data.employee_comments ? (
              <div className="mt-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.03em] text-ink-soft">
                  Employee Comments
                </div>
                <p className="mt-1 whitespace-pre-wrap text-[13px] text-ink-soft">
                  {review.data.employee_comments}
                </p>
              </div>
            ) : null}
          </Card>

          {review.data.status === "draft" ? (
            <Card>
              <CardHeader title="Submit Review" />
              <form onSubmit={submitReview} className="flex flex-col gap-4">
                <div>
                  <Label htmlFor="rating">Rating</Label>
                  <Select id="rating" value={rating} onChange={(event) => setRating(event.target.value)}>
                    <option value="">Not rated</option>
                    {RATINGS.map((value) => (
                      <option key={value} value={value}>
                        {value} / 5
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="manager-comments">Manager Comments</Label>
                  <Textarea
                    id="manager-comments"
                    value={managerComments}
                    onChange={(event) => setManagerComments(event.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Submitting…" : "Submit Review"}
                  </Button>
                </div>
              </form>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
