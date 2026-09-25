function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export interface PasswordResetSuccessEmailOptions {
  to: string;
  portalLabel: string;
  loginUrl?: string;
  appName?: string;
  supportEmail?: string;
  resetAt?: Date;
}

export function buildPasswordResetSuccessEmailHtml(options: PasswordResetSuccessEmailOptions): string {
  const appName = escapeHtml(options.appName || 'Dart Smart Salon');
  const portalName = escapeHtml(options.portalLabel || 'Salon Admin');
  const userEmail = escapeHtml(options.to);
  const loginUrl = escapeHtml(options.loginUrl || 'http://localhost:5173/salon/login');
  const supportEmail = escapeHtml(options.supportEmail || 'support@dartsmartsalon.com');
  const currentYear = new Date().getFullYear();
  const resetTimeStr = (options.resetAt || new Date()).toUTCString();

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en" xml:lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <!--[if !mso]><!-->
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <!--<![endif]-->
  <title>Password Reset Successful - ${appName}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    
    /* Client-specific resets */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f1f5f9; }

    /* iOS blue links reset */
    a[x-apple-data-detectors] {
      color: inherit !important;
      text-decoration: none !important;
      font-size: inherit !important;
      font-family: inherit !important;
      font-weight: inherit !important;
      line-height: inherit !important;
    }

    /* Mobile responsive */
    @media screen and (max-width: 600px) {
      .email-wrapper {
        width: 100% !important;
        padding: 12px !important;
      }
      .card-body {
        padding: 28px 20px !important;
      }
      .header-content {
        padding: 28px 20px !important;
      }
      .button-cell {
        display: block !important;
        width: 100% !important;
      }
      .cta-button {
        display: block !important;
        width: 100% !important;
        text-align: center !important;
        box-sizing: border-box !important;
      }
      .break-word {
        word-break: break-all !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">

  <!-- Preheader text (inbox snippet) -->
  <div style="display: none; font-size: 1px; color: #f1f5f9; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    Your password for ${appName} (${portalName}) has been reset successfully.
    &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy;
  </div>

  <!-- Background Wrapper -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 40px 16px 48px;">

        <!-- Email Container (Max 580px) -->
        <!--[if (gte mso 9)|(IE)]>
        <table align="center" border="0" cellspacing="0" cellpadding="0" width="580">
        <tr>
        <td align="center" valign="top" width="580">
        <![endif]-->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-wrapper" style="max-width: 580px; margin: 0 auto;">
          
          <!-- MAIN CARD -->
          <tr>
            <td style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04); border: 1px solid #e2e8f0;">
              
              <!-- CARD HEADER WITH LUXURY GRADIENT -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td class="header-content" style="background: #0f172a linear-gradient(135deg, #0f172a 0%, #064e3b 60%, #047857 100%); padding: 36px 40px; text-align: left;">
                    
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <!-- Brand Icon -->
                        <td width="48" style="vertical-align: middle; padding-right: 14px;">
                          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); width: 44px; height: 44px; border-radius: 12px; text-align: center; line-height: 44px; display: inline-block; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4); border: 1px solid rgba(255, 255, 255, 0.15);">
                            <span style="font-size: 20px; line-height: 44px; color: #ffffff; display: block;">&#10004;&#65039;</span>
                          </div>
                        </td>
                        <!-- Brand Title & Subtitle -->
                        <td style="vertical-align: middle;">
                          <div style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em; line-height: 1.2; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                            ${appName}
                          </div>
                          <div style="font-size: 12px; font-weight: 500; color: #a7f3d0; letter-spacing: 0.04em; text-transform: uppercase; margin-top: 3px;">
                            Security Notification
                          </div>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

              <!-- CARD BODY -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td class="card-body" style="padding: 40px 40px 36px; background-color: #ffffff;">

                    <!-- Success Pill Badge -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                      <tr>
                        <td style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 9999px; padding: 6px 14px; text-align: center;">
                          <span style="font-size: 12px; font-weight: 700; color: #047857; letter-spacing: 0.02em; display: inline-block; vertical-align: middle;">
                            &#9989; Password Successfully Updated &bull; ${portalName}
                          </span>
                        </td>
                      </tr>
                    </table>

                    <!-- Heading -->
                    <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 800; color: #0f172a; line-height: 1.3; letter-spacing: -0.025em; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      Your Password Has Been Reset
                    </h1>

                    <!-- Paragraphs -->
                    <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                      Hello,
                    </p>
                    <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                      The password for your <strong style="color: #0f172a;">${portalName}</strong> account (<strong style="color: #0f172a;">${userEmail}</strong>) has been successfully reset. You can now use your new password to sign in.
                    </p>

                    <!-- Activity Summary Box -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 28px;">
                      <tr>
                        <td style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #10b981; border-radius: 8px; padding: 14px 18px;">
                          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <td style="padding-bottom: 6px;">
                                <span style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Account</span>
                                <div style="font-size: 14px; font-weight: 700; color: #0f172a;">${userEmail} (${portalName})</div>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding-top: 6px; border-top: 1px dashed #e2e8f0;">
                                <span style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Time of Change</span>
                                <div style="font-size: 13px; font-weight: 600; color: #334155;">${resetTimeStr}</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- CTA BUTTON SECTION -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 8px 0 28px 0;">
                      <tr>
                        <td align="center">
                          <!--[if mso]>
                          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${loginUrl}" style="height:52px;v-text-anchor:middle;width:260px;" arcsize="20%" strokecolor="#047857" fillcolor="#059669">
                            <w:anchorlock/>
                            <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:bold;letter-spacing:0.02em;">
                              Sign In to Dashboard &rarr;
                            </center>
                          </v:roundrect>
                          <![endif]-->
                          <!--[if !mso]><!-->
                          <a href="${loginUrl}" target="_blank" rel="noopener noreferrer" class="cta-button" style="background: #059669 linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff !important; display: inline-block; font-size: 15px; font-weight: 700; text-decoration: none; padding: 16px 36px; border-radius: 10px; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.35); letter-spacing: 0.01em; border: 1px solid #047857;">
                            Sign In to Dashboard &nbsp;&rarr;
                          </a>
                          <!--<![endif]-->
                        </td>
                      </tr>
                    </table>

                    <!-- Divider -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0;">
                      <tr>
                        <td style="border-top: 1px solid #e2e8f0; font-size: 1px; line-height: 1px;">&nbsp;</td>
                      </tr>
                    </table>

                    <!-- Security Alert Warning Box -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 16px 18px;">
                          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <td width="28" style="vertical-align: top; padding-right: 10px;">
                                <span style="font-size: 18px; line-height: 1;">&#9888;&#65039;</span>
                              </td>
                              <td style="vertical-align: top;">
                                <div style="font-size: 13px; font-weight: 700; color: #991b1b; margin-bottom: 4px;">
                                  Did not authorize this change?
                                </div>
                                <div style="font-size: 13px; line-height: 1.5; color: #7f1d1d;">
                                  If you did not reset your password, someone may have gained unauthorized access to your account. Please contact our support team immediately at <a href="mailto:${supportEmail}" style="color: #991b1b; font-weight: 700; text-decoration: underline;">${supportEmail}</a> to secure your account.
                                </div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding: 28px 16px 0; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: #64748b; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                ${appName}
              </p>
              <p style="margin: 0 0 8px 0; font-size: 12px; line-height: 1.5; color: #94a3b8;">
                Next-Gen Salon Management &bull; Appointments &bull; Billing &bull; Analytics
              </p>
              <p style="margin: 0 0 12px 0; font-size: 11px; line-height: 1.5; color: #94a3b8;">
                This automated security confirmation was dispatched to <span style="color: #64748b; font-weight: 600;">${userEmail}</span>.<br />
                Please do not reply directly to this automated email.
              </p>
              <p style="margin: 0; font-size: 11px; color: #cbd5e1;">
                &copy; ${currentYear} ${appName}. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
        <!--[if (gte mso 9)|(IE)]>
        </td>
        </tr>
        </table>
        <![endif]-->

      </td>
    </tr>
  </table>

</body>
</html>`;
}
