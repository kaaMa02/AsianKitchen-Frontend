import * as React from "react";
import Button, { ButtonProps } from "@mui/material/Button";
import type { SxProps, Theme } from "@mui/material/styles";
import clsx from "clsx";
import { Link as RouterLink } from 'react-router-dom';

type Props = ButtonProps & {
  asLinkHref?: string;
  dense?: boolean; // optional: use elsewhere if you need a smaller pill
};

export default function AKButton({
  className,
  asLinkHref,
  dense = false,
  children,
  sx,
  variant = "contained",
  ...rest
}: Props) {
  const href = asLinkHref ?? (rest as any).href;

  const isExternal =
    !!href && (href.startsWith("http://") || href.startsWith("https://"));

  // Hero pill – LONG but slimmer
  const heroSx: SxProps<Theme> = {
    px: { xs: 5, md: 7 }, // was 7/9 → slimmer horizontally
    py: { xs: 0.7, md: 0.85 }, // was 1.15/1.35 → slimmer vertically
    lineHeight: 1.15, // override MUI’s taller default
    minHeight: { xs: 50, md: 70 },
    minWidth: { xs: 200, md: 300 }, // longer pill
    fontSize: { xs: 20, md: 26 }, // keep large text
  };

  // Optional smaller pill
  const denseSx: SxProps<Theme> = {
    px: { xs: 4, md: 5 },
    py: { xs: 0.55, md: 0.7 },
    lineHeight: 1.1,
    minHeight: { xs: 36, md: 40 },
    fontSize: { xs: 16, md: 18 },
  };

  const baseSx: SxProps<Theme> = {
    borderRadius: 999,
    textTransform: "none",
    fontWeight: 450,
    letterSpacing: "0.02em",
    bgcolor: "#C88C1A",
    color: "#F6F0DE",
    boxShadow: 1,
    "&:hover": { opacity: 0.95, bgcolor: "#C88C1A" },
    width: "100%", // so grid cells make each button same width
    ...(dense ? denseSx : heroSx),
  };

  const mergedSx: SxProps<Theme> = Array.isArray(sx)
    ? [baseSx, ...sx]
    : [baseSx, sx];

  return (
    <Button
      variant={variant}
      disableElevation
      component={href ? (isExternal ? 'a' : RouterLink) : rest.component}
      {...(href ? (isExternal ? ({ href } as any) : ({ to: href } as any)) : {})}
      // add target/rel ONLY for external links (and cast to avoid MUI type limitation)
      {...(isExternal ? ({ target: '_blank', rel: 'noopener noreferrer' } as any) : {})}
      className={clsx(className)}
      sx={mergedSx}
      {...rest}
    >
      {children}
    </Button>
  );
}
