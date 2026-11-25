import "./globals.css";

export const metadata = {
  title: "Secure Access",
  description: "Sign up and log in with a 6-digit code or your fingerprint or face. One active device per account.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
