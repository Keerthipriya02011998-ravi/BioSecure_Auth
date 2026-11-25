// Delivery of the 6-digit code.
// Demo mode logs the code to the server console (and the API can return it to the UI).
// To go live, call Twilio / MSG91 for phones and Resend / SendGrid / Nodemailer for email here.
export async function sendCode(identifier, code) {
  console.log(`\n[Secure Access] 6-digit code for ${identifier}: ${code}\n`);
}

export function demoCodesVisible() {
  return process.env.DEMO_SHOW_CODE !== "false";
}
