import { Fragment } from "react";

// "25 · Tel Aviv · 3 items". Each part is isolated, so a Hebrew city next to English text
// doesn't change the reading order.
export function Details({ parts }: { parts: (string | number | null)[] }) {
  return parts
    .filter((part) => part !== null && part !== "")
    .map((part, i) => (
      <Fragment key={i}>
        {i > 0 && " · "}
        <bdi>{part}</bdi>
      </Fragment>
    ));
}
