# Privacy Policy — SideNbr

**Last updated:** 2026-07-31  
**Product:** SideNbr (Chrome Extension)  
**Contact:** [Replace with maintainer email before store submission]

This document is a **draft** privacy policy intended for Chrome Web Store listing and user transparency. Align final legal text with your publishing entity before submission.

---

## 1. Summary

SideNbr is a local browser extension that opens a Chrome Side Panel and loads the official Perplexity and ChatGPT websites inside an iframe. The extension does **not** operate an AI backend, does **not** use API keys for those services, and does **not** read or upload your chat content.

---

## 2. Data we do not collect

In line with the product design (spec §14.2):

1. **Chat content** — The extension does **not** read, store, or transmit conversations you have inside ChatGPT or Perplexity (including prompts, responses, file uploads, or history shown in those pages).
2. **Page content from other sites** — The extension does **not** scrape or send the content of the webpage you are browsing.
3. **Credentials** — The extension does **not** read passwords, session tokens, or cookies of third-party sites for the purpose of copying or exfiltrating them.
4. **Advertising / analytics IDs** — The extension does **not** embed third-party advertising or analytics SDKs, and does **not** sell user data.
5. **Account profiles** — The extension does **not** create its own user accounts or sync chat history to a developer-operated server.

---

## 3. Data processed locally

The extension may store **only** lightweight preferences in `chrome.storage.local` on your device, for example:

- Last selected AI service (`activeProvider`, e.g. Perplexity or ChatGPT)
- Optional UI settings that may be added in future versions (theme, low-memory mode, etc.)

This data stays on your machine unless you back up or sync your Chrome profile through Google’s own browser sync (outside this extension’s control).

---

## 4. How AI services work in the panel

- When you use Perplexity or ChatGPT in the side panel, your browser communicates **directly** with those providers’ websites (HTTPS).
- That traffic is subject to **their** terms of service and privacy policies (e.g. OpenAI / ChatGPT, Perplexity).
- The extension authors do not receive a copy of that traffic.

---

## 5. Permissions (Store-safe build)

Typical permissions for the public / Store-safe package:

| Permission / field | Purpose |
|--------------------|---------|
| `sidePanel` | Show the extension UI in Chrome’s side panel |
| `storage` | Save local preferences such as the active provider |
| Host permissions for `perplexity.ai`, `chatgpt.com`, `openai.com` | Allow embedding those sites with appropriate storage/cookie behavior for extension pages; not used to download chat logs to our servers |

We do **not** request `<all_urls>`, browsing history, or unrestricted `webRequest` in the Store-safe design.

### Frame compatibility (open-source package)

The published package may adjust **sub_frame** response headers (e.g. X-Frame-Options / CSP) for known AI hosts so pages can load in the side panel. This is part of the single open-source build and is **not** aimed at Chrome Web Store distribution.

### Other notes

Separately packaged **private** builds may include `declarativeNetRequestWithHostAccess` and local rules that modify certain response headers for **sub_frame** loads only, solely to test embed compatibility. Those builds are **not** intended for Chrome Web Store distribution and must be labeled clearly for the user. See `private/README.md` in the source repository.

---

## 6. Network behavior

- **No developer-operated API** is required for core features.
- The extension does not phone home with chat content or browsing URLs.
- Any network activity you see for ChatGPT / Perplexity originates from those third-party pages inside the iframe (or from opening their sites in a normal tab).

---

## 7. Children

The extension is not directed at children under 13 (or the age required in your jurisdiction). Use of embedded third-party AI services is governed by those services’ age and account rules.

---

## 8. Future features

If a future version adds capabilities such as “send current page title/URL to the AI” or reading selected text, we will:

- Update this privacy policy  
- Adjust Chrome permission declarations as required  
- Require a clear, user-initiated action before reading page data  

---

## 9. Changes

We may update this policy when the product or legal requirements change. The “Last updated” date at the top will be revised accordingly. Material changes should be reflected in the Chrome Web Store listing.

---

## 10. Contact

For privacy questions about this extension (not about ChatGPT or Perplexity themselves), contact:

**[Your name / company] — [email@example.com]**

For data practices of OpenAI, Perplexity, or other embedded sites, please refer to those companies’ own privacy policies.
