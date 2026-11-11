# Sign-in

People can sign in with an email and password, or with Google, Microsoft or
LinkedIn. GitHub is **not** a way to sign in. It can only be connected in
Settings, where it proves that repositories a person submits as evidence are
theirs.

Each provider's button appears only when both of its settings are present, so
nothing shows until you set it up. Start with Google: it covers most people
and takes about ten minutes.

## Settings

| Setting                   | Type in Vercel | What it is                                            |
| ------------------------- | -------------- | ----------------------------------------------------- |
| `GOOGLE_CLIENT_ID`        | Config         | Google's "Client ID"                                  |
| `GOOGLE_CLIENT_SECRET`    | Secret         | Google's "Client secret"                              |
| `MICROSOFT_CLIENT_ID`     | Config         | Microsoft's "Application (client) ID"                 |
| `MICROSOFT_CLIENT_SECRET` | Secret         | The **Value** of a client secret, not its "Secret ID" |
| `MICROSOFT_TENANT`        | Config         | Optional. Leave unset unless you limit who can use it |
| `LINKEDIN_CLIENT_ID`      | Config         | LinkedIn's "Client ID"                                |
| `LINKEDIN_CLIENT_SECRET`  | Secret         | LinkedIn's "Primary Client Secret"                    |

Add them for **Production**, then redeploy. Vercel only reads new settings on
a new deployment.

Each provider asks for a return address (a "redirect URI"). It must match
exactly, with no slash at the end:

```
https://YOUR-SITE/api/auth/oauth/google/callback
https://YOUR-SITE/api/auth/oauth/microsoft/callback
https://YOUR-SITE/api/auth/oauth/linkedin/callback
```

`YOUR-SITE` is the address in `NEXT_PUBLIC_APP_URL`. If the site later moves to
its own domain, add the new addresses with each provider as well.

## Google

1. Open the [Google Cloud console](https://console.cloud.google.com/) and
   create a project called "Nexus".
2. Open **Google Auth Platform** (also listed as "OAuth consent screen") and
   choose **Get started**. App name: Nexus. Audience: **External**.
3. Under **Audience**, choose **Publish app**. With only a name and an email
   address requested, Google needs no review.
4. Under **Clients**, choose **Create client**. Type: **Web application**.
   Under "Authorized redirect URIs" add the Google address above.
5. Copy the **Client ID** and the **Client secret**. Google shows the secret
   only once.

## LinkedIn

1. Open [LinkedIn developer apps](https://www.linkedin.com/developers/apps)
   and choose **Create app**. LinkedIn asks for a company Page; create one for
   Nexus if there isn't one.
2. On the **Products** tab, request **Sign In with LinkedIn using OpenID
   Connect**. It is approved straight away.
3. On the **Auth** tab, add the LinkedIn address above under "Authorized
   redirect URLs".
4. Copy the **Client ID** and the **Primary Client Secret** from the same tab.

## Microsoft

Microsoft needs an Azure account, which is free but asks for a card to check
who you are. Leave this one for later if that is a problem.

1. Open [App registrations](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
   and choose **New registration**.
2. Supported account types: **Accounts in any organizational directory and
   personal Microsoft accounts**. Redirect URI: **Web**, with the Microsoft
   address above.
3. Copy the **Application (client) ID**.
4. Under **Certificates & secrets**, create a **New client secret** and copy
   its **Value**. The secret expires (two years at most); set a reminder to
   replace it.
5. Optional: under **Token configuration**, add the optional ID claims `email`
   and `xms_edov`. Without them, people with a work or school account can
   connect Microsoft in Settings but can't create an account with it.

## How accounts are matched

The rules live in `lib/auth/oauth/account.ts`. They exist so that nobody can
get into someone else's account by putting that person's email address on a
provider profile.

1. An account is found **only** by the provider's permanent ID for the person.
   Email is never used to find an account.
2. A new account is created only from an address the provider has verified,
   and only when no account uses that address yet. For Microsoft that means a
   personal account, or a work or school account whose token carries
   `xms_edov`.
3. If an account with that address already exists, nothing is linked. The
   person signs in the way they already do and connects the provider in
   Settings, or resets their password by email. One exception: Google runs the
   mailbox itself (a Gmail address, or an address on the person's own Google
   Workspace domain) and the account's address was already confirmed. Then
   Google is linked and they are signed in. This is how people who used to sign
   in with GitHub get back in. An unconfirmed account is never linked this way,
   because anyone can register someone else's address with a password.
4. Resetting a password by email proves the mailbox is theirs. It signs out
   every device, removes every linked account, and marks the address as
   confirmed. Whoever registered the address first, or linked their own
   account to it, keeps no way in.

Nothing a provider sends is stored except its ID for the person and the email
address of the linked account. Access tokens are used once and discarded.

## Admins

Accounts listed in `ADMIN_EMAILS` can open `/admin`: every user's record,
billing and the review queue. An address listed there only counts once it is
confirmed (rule 4, or an account created through a provider), so registering an
unused admin address with a password opens nothing. Accounts created before
11 November 2026 keep the access they had.
