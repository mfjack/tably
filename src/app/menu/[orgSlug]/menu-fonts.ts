import {
  Bagel_Fat_One,
  Courier_Prime,
  Kaushan_Script,
  Lobster_Two,
} from "next/font/google";

export const menuTitleFont = Bagel_Fat_One({
  weight: "400",
  subsets: ["latin"],
});

export const menuTaglineFont = Kaushan_Script({
  weight: "400",
  subsets: ["latin"],
});

export const menuHeadingFont = Lobster_Two({
  weight: "700",
  style: "italic",
  subsets: ["latin"],
});

export const menuItemFont = Courier_Prime({
  weight: ["400", "700"],
  subsets: ["latin"],
});
