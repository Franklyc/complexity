import { SVGProps } from "react";

export default function Cplx(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 257 256"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect width="256" height="256" rx="6" fill="transparent" />
      <rect
        x="44.0001"
        y="64.7988"
        width="28"
        height="88"
        rx="6"
        transform="rotate(-45 44.0001 64.7988)"
        fill="white"
      />
      <rect
        width="28"
        height="88"
        rx="6"
        transform="matrix(-0.707107 -0.707107 -0.707107 0.707107 212.024 64.7988)"
        fill="var(--accent-foreground)"
      />
      <rect
        x="106.225"
        y="129"
        width="28"
        height="88"
        rx="6"
        transform="rotate(45 106.225 129)"
        fill="var(--accent-foreground)"
      />
      <rect
        width="28"
        height="88"
        rx="6"
        transform="matrix(-0.707107 0.707107 0.707107 0.707107 149.823 129)"
        fill="white"
      />
    </svg>
  );
}
