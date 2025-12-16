import * as React from "react";
import Button, { ButtonProps } from "@mui/material/Button";
import type { Theme } from "@mui/material/styles";
import type { SystemStyleObject } from "@mui/system";
import clsx from "clsx";

type Props = Omit<ButtonProps, "href"> & {
  asLinkHref?: string;
  dense?: boolean;
  target?: React.HTMLAttributeAnchorTarget;
  rel?: string;
};

export default function AKButton({
  className,
  asLinkHref,
  dense = false,
  target,
  rel,
  children,
  sx,
  variant = "contained",
  ...rest
}: Props) {
  const isLink = Boolean(asLinkHref);

  const heroSx: SystemStyleObject<Theme> = {
    px: { xs: 5, md: 7 },
    py: { xs: 0.7, md: 0.85 },
    minHeight: { xs: 50, md: 70 },
    minWidth: { xs: 200, md: 300 },
    fontSize: { xs: 20, md: 26 },
  };

  const denseSx: SystemStyleObject<Theme> = {
    px: { xs: 4, md: 5 },
    py: { xs: 0.55, md: 0.7 },
    minHeight: { xs: 36, md: 40 },
    fontSize: { xs: 16, md: 18 },
  };

  const baseSx: SystemStyleObject<Theme> = {
    borderRadius: 999,
    textTransform: "none",
    fontWeight: 450,
    bgcolor: "#C88C1A",
    color: "#F6F0DE",
    "&:hover": { opacity: 0.95, bgcolor: "#C88C1A" },
    width: "100%",
    ...(dense ? denseSx : heroSx),
  };

  // ✅ key: build array and filter out falsy values
  const sxArray = [baseSx, sx].filter(Boolean);

  return (
    <Button
      component={isLink ? "a" : "button"}
      href={isLink ? asLinkHref : undefined}
      target={isLink ? target : undefined}
      rel={isLink ? rel : undefined}
      variant={variant}
      disableElevation
      className={clsx(className)}
      sx={sxArray as any}
      {...rest}
    >
      {children}
    </Button>
  );
}
